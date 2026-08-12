-- Security hardening: move the Non-Negotiable Rules from the client into the database.
--
-- Rules 2 (server-generated invoice/DC numbers) and 3 (atomic transaction write)
-- were enforced only by the client choosing to call `create_transaction`. Nothing
-- stopped a signed-in manager from calling PostgREST directly:
--
--   POST /rest/v1/transactions {"invoice_no": 9999, "created_by": "<someone-else>", ...}
--
-- which forges a billing number, misattributes the write, and skips the party
-- balance and stock updates entirely. The same held for `expenses.created_by`
-- (client-supplied, so the TRD auditability requirement was unenforceable) and
-- `parties.balance` (a derived column any manager could set to anything).
--
-- The fix in one sentence: the trust boundary moves from the sign-in screen to
-- the table. Derived and identifying columns become unwritable by end users, and
-- the RPCs that maintain them become the only way in.
--
--   1. Data repair + CHECK constraints         (negative quantities)
--   2. create_transaction rewritten            (validation, search_path, definer)
--   3. adjust_stock added                      (atomic read-modify-write)
--   4. Policies rewritten                      (write paths closed, TO authenticated)
--   5. Column-level grants                     (balance / created_by unwritable)
--   6. custom_access_token_hook search_path    (privileged function hardening)
--
-- AFTER RUNNING THIS: no sign-out is needed, no claim changes. Run
-- `npm run test:rls` to confirm the payroll boundary AND the new write boundaries.


-- 1. Data repair, then value constraints --------------------------------------
--
-- create_transaction decremented stock.filled with no floor, so a project that
-- recorded more cylinders out than it held can be holding a negative row. Clamp
-- before constraining, or the ALTER fails partway through the migration.

update public.stock set quantity = 0 where quantity < 0;

alter table public.stock
  add constraint stock_quantity_non_negative check (quantity >= 0);

-- Same treatment as stock: security_deposit is current state, not history, so a
-- stray negative is safe to clamp. Without this the ALTER below aborts the whole
-- migration on any project that has one.
update public.parties set security_deposit = 0 where security_deposit < 0;

alter table public.parties
  add constraint parties_deposit_non_negative check (security_deposit >= 0);

-- balance is deliberately NOT constrained: a party returning more empties than
-- they hold is a real (if rare) correction, and a negative balance is meaningful.

-- NOT VALID, unlike the two above: these are billing history. Clamping a
-- recorded filled_sent would rewrite what was actually invoiced, so existing
-- rows are exempt and only new writes are checked. Back-fill and
-- VALIDATE CONSTRAINT later if the history is ever reconciled.
alter table public.transactions
  add constraint transactions_filled_sent_non_negative check (filled_sent >= 0) not valid,
  add constraint transactions_empty_received_non_negative check (empty_received >= 0) not valid;

-- NOT VALID: existing rows are exempt. A 0/0 transaction was reachable from the
-- old form (it only required a party and a cylinder type), so historical rows may
-- violate this. New writes are checked; back-fill and VALIDATE CONSTRAINT later
-- if those rows are ever cleaned up.
alter table public.transactions
  add constraint transactions_movement_non_empty check (filled_sent + empty_received > 0) not valid;


-- 2. create_transaction: validated, pinned search_path, security definer -------
--
-- Now SECURITY DEFINER, which deliberately reverses the note in 0002. It has to
-- be: step 4 removes end-user INSERT on transactions and UPDATE on stock, so an
-- invoker-rights function could no longer do its job. The authorisation RLS used
-- to perform is therefore made explicit here, as the first statement, before any
-- state is touched.
--
-- set search_path = '' prevents a search-path hijack of the unqualified names a
-- definer function would otherwise resolve as its owner (postgres). Every
-- reference below is schema-qualified as a result; pg_catalog is still implicitly
-- searched, so built-in operators and functions need no qualification.
--
-- Validation moved ahead of nextval(). Sequences are non-transactional, so a
-- failure after nextval() burns an invoice number permanently, leaving a gap in a
-- legally-sequenced series that no rollback can close.

create or replace function public.create_transaction(
  p_party_id uuid,
  p_date date,
  p_cylinder_type text,
  p_filled_sent integer,
  p_empty_received integer
)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_invoice_no integer;
  v_dc_no integer;
  v_transaction public.transactions;
  v_filled_available integer;
begin
  -- Authorisation. RLS no longer covers this function, so it is checked by hand.
  if auth.jwt() ->> 'app_role' not in ('owner', 'manager') then
    raise exception 'Not authorised to record transactions'
      using errcode = '42501';
  end if;

  -- Validation, all of it before the first nextval().
  if p_filled_sent is null or p_empty_received is null then
    raise exception 'Quantities are required';
  end if;

  if p_filled_sent < 0 or p_empty_received < 0 then
    raise exception 'Quantities must be zero or more';
  end if;

  if p_filled_sent + p_empty_received = 0 then
    raise exception 'A transaction must move at least one cylinder';
  end if;

  if p_cylinder_type is null or btrim(p_cylinder_type) = '' then
    raise exception 'Cylinder type is required';
  end if;

  if p_date is null then
    raise exception 'Date is required';
  end if;

  if not exists (select 1 from public.parties where id = p_party_id) then
    raise exception 'Party % does not exist', p_party_id;
  end if;

  -- Stock sufficiency. The CHECK from step 1 would catch this too, but only as a
  -- constraint violation the caller cannot act on; this says what is really wrong.
  select quantity into v_filled_available from public.stock where status = 'filled';

  if v_filled_available < p_filled_sent then
    raise exception 'Only % filled cylinder(s) in stock, cannot send %',
      v_filled_available, p_filled_sent;
  end if;

  v_invoice_no := nextval('public.invoice_no_seq');
  v_dc_no := nextval('public.dc_no_seq');

  insert into public.transactions (
    party_id, date, invoice_no, dc_no, cylinder_type, filled_sent, empty_received, created_by
  ) values (
    p_party_id, p_date, v_invoice_no, v_dc_no, btrim(p_cylinder_type),
    p_filled_sent, p_empty_received, auth.uid()
  )
  returning * into v_transaction;

  update public.parties
  set balance = balance + p_filled_sent - p_empty_received
  where id = p_party_id;

  update public.stock set quantity = quantity - p_filled_sent, updated_at = now() where status = 'filled';
  update public.stock set quantity = quantity + p_filled_sent, updated_at = now() where status = 'at_customer';
  update public.stock set quantity = quantity + p_empty_received, updated_at = now() where status = 'empty';
  update public.stock set quantity = greatest(0, quantity - p_empty_received), updated_at = now() where status = 'at_customer';

  return v_transaction;
end;
$func$;

revoke execute on function public.create_transaction(uuid, date, text, integer, integer) from public, anon;
grant execute on function public.create_transaction(uuid, date, text, integer, integer) to authenticated;


-- 3. adjust_stock: the read-modify-write becomes one atomic statement ----------
--
-- The client used to read the current quantity out of React state, add the delta
-- locally, and write an absolute value back. Two managers adjusting at once, or
-- one on a stale screen, silently overwrote each other. Doing the arithmetic in a
-- single UPDATE closes the window.

create or replace function public.adjust_stock(
  p_status text,
  p_delta integer
)
returns public.stock
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_row public.stock;
begin
  if auth.jwt() ->> 'app_role' not in ('owner', 'manager') then
    raise exception 'Not authorised to adjust stock'
      using errcode = '42501';
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception 'Adjustment amount is required';
  end if;

  update public.stock
  set quantity = greatest(0, quantity + p_delta), updated_at = now()
  where status = p_status
  returning * into v_row;

  if not found then
    raise exception 'Unknown stock status %', p_status;
  end if;

  return v_row;
end;
$func$;

revoke execute on function public.adjust_stock(text, integer) from public, anon;
grant execute on function public.adjust_stock(text, integer) to authenticated;


-- 4. Policies: close the direct write paths -----------------------------------
--
-- Every policy below is scoped `to authenticated`. Anonymous callers were already
-- denied (the claim is NULL, so NULL in (...) is never true), but scoping means
-- the policy is not evaluated for anon at all, and states the intent outright.

-- transactions: readable, but writable only through create_transaction. No
-- INSERT/UPDATE/DELETE policy exists, so all three are denied by default.
drop policy if exists "owner_and_manager_full_access" on public.transactions;

create policy "read_transactions" on public.transactions
  for select to authenticated
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

-- stock: readable, but writable only through adjust_stock / create_transaction.
drop policy if exists "owner_and_manager_full_access" on public.stock;

create policy "read_stock" on public.stock
  for select to authenticated
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

-- parties: still fully writable by both roles. balance is excluded at the grant
-- level in step 5 instead, because a policy cannot restrict which COLUMNS an
-- UPDATE touches, only which rows.
drop policy if exists "owner_and_manager_full_access" on public.parties;

create policy "owner_and_manager_full_access" on public.parties
  for all to authenticated
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'))
  with check (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

-- expenses: insert as yourself; edit and delete only your own.
--
-- NOTE - this narrows CLAUDE.md's "both owner and manager have full read/write"
-- for this one table. Attribution is worthless if any manager can rewrite another
-- user's expense, and the TRD lists created_by as the auditability control. Reads
-- stay unrestricted (the dashboards aggregate across everyone) and the owner
-- keeps full write access, so no PRD story regresses: EXP-1..EXP-5 only ever
-- create and read.
drop policy if exists "owner_and_manager_full_access" on public.expenses;

create policy "read_expenses" on public.expenses
  for select to authenticated
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

create policy "insert_own_expenses" on public.expenses
  for insert to authenticated
  with check (
    auth.jwt() ->> 'app_role' in ('owner', 'manager')
    and created_by = auth.uid()
  );

create policy "modify_own_expenses" on public.expenses
  for update to authenticated
  using (created_by = auth.uid() or auth.jwt() ->> 'app_role' = 'owner')
  with check (created_by = auth.uid() or auth.jwt() ->> 'app_role' = 'owner');

create policy "delete_own_expenses" on public.expenses
  for delete to authenticated
  using (created_by = auth.uid() or auth.jwt() ->> 'app_role' = 'owner');

-- users: unchanged in substance, re-scoped `to authenticated`.
drop policy if exists "read_all_users" on public.users;
create policy "read_all_users" on public.users
  for select to authenticated
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

-- employees: unchanged in substance, re-scoped `to authenticated`. The payroll
-- boundary is Non-Negotiable Rule 1: still owner-only, still no manager policy,
-- still proven by tests/rls-employees.test.ts.
drop policy if exists "owner_full_access" on public.employees;
create policy "owner_full_access" on public.employees
  for all to authenticated
  using (auth.jwt() ->> 'app_role' = 'owner')
  with check (auth.jwt() ->> 'app_role' = 'owner');


-- 5. Column-level grants ------------------------------------------------------
--
-- RLS decides which ROWS you may touch; it cannot decide which COLUMNS. Derived
-- and identifying columns are therefore removed from the table-level grant.
--
-- A table-level privilege implies every column, and revoking one column while the
-- table-level grant stands has no effect - so each table-level privilege is
-- revoked first, then re-granted column by column.

-- parties.balance: derived from transaction history, moved only by
-- create_transaction (definer-rights, so unaffected by these grants).
revoke update on public.parties from authenticated, anon;
grant update (name, contact, security_deposit) on public.parties to authenticated;

-- created_by: stamped by the DEFAULT, never asserted by the client.
alter table public.expenses alter column created_by set default auth.uid();
alter table public.transactions alter column created_by set default auth.uid();

revoke insert, update on public.expenses from authenticated, anon;
grant insert (date, amount, category, note) on public.expenses to authenticated;
grant update (date, amount, category, note) on public.expenses to authenticated;

-- Direct writes to transactions and stock go through the RPCs only.
revoke insert, update, delete on public.transactions from authenticated, anon;
revoke insert, update, delete on public.stock from authenticated, anon;

-- anon has no business with any of this.
revoke all on public.parties, public.expenses, public.transactions,
              public.stock, public.employees, public.users from anon;


-- 6. Harden the privileged auth hook ------------------------------------------
--
-- The hook runs as supabase_auth_admin, one of the most privileged roles in the
-- project, and had a mutable search_path. Unqualified name resolution in a
-- function that privileged is a standing escalation risk, and is what the
-- Supabase linter flags as function_search_path_mutable. Behaviour unchanged.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $func$
declare
  claims jsonb;
  user_role text;
begin
  select role into user_role from public.users where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
  end if;

  return jsonb_build_object('claims', claims);
end;
$func$;

grant usage on schema public to supabase_auth_admin;
grant select on table public.users to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
