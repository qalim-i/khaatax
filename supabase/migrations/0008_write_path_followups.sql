-- Follow-ups to 0007, from a review of the hardened write path.
--
-- 0007 moved the trust boundary to the table. These are three gaps left in it:
--
--   1. create_transaction read stock without locking it, and treated a missing
--      stock row as sufficient stock.
--   2. parties had column-level UPDATE grants but table-level INSERT, so the
--      derived `balance` column was still client-settable on creation.
--   3. User-facing RPC messages were identified by SQLSTATE P0001 — the default
--      for *any* bare `raise exception` in the database, ours or not.
--
-- 0007 is left as-is (it is already applied); everything here is written to be
-- safe to run on top of it. `create or replace function` and the grant
-- statements are all re-runnable.
--
-- AFTER RUNNING THIS: run `npm run test:rls`.
--
-- NOTE ON DEPLOY ORDER: src/lib/errors.ts now recognises 'KX001', not 'P0001',
-- as the marker for a message meant for the user. Apply this migration before
-- shipping an app build with that change, or stock/validation failures will show
-- the generic fallback text instead of the specific reason.


-- 1. create_transaction: lock the stock row, reject a missing one -------------
--
-- The old read was:
--
--   select quantity into v_filled_available from public.stock where status = 'filled';
--
-- Two problems.
--
-- No FOR UPDATE: two concurrent calls both read the same quantity, both pass the
-- sufficiency check, and both decrement — overselling stock the check was there
-- to protect. The function is the only write path precisely so this cannot
-- happen, and without the lock it still could.
--
-- No NULL handling: with no 'filled' row at all, v_filled_available is NULL, and
-- `NULL < p_filled_sent` is NULL, which is not true — so the guard falls through
-- and the transaction proceeds against stock that does not exist. The subsequent
-- UPDATEs then match zero rows and silently do nothing.
--
-- Both are fixed before the first nextval(), so a rejection still costs no
-- invoice number.

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
  if auth.jwt() ->> 'app_role' not in ('owner', 'manager') then
    raise exception 'Not authorised to record transactions'
      using errcode = '42501';
  end if;

  if p_filled_sent is null or p_empty_received is null then
    raise exception 'Quantities are required' using errcode = 'KX001';
  end if;

  if p_filled_sent < 0 or p_empty_received < 0 then
    raise exception 'Quantities must be zero or more' using errcode = 'KX001';
  end if;

  if p_filled_sent + p_empty_received = 0 then
    raise exception 'A transaction must move at least one cylinder' using errcode = 'KX001';
  end if;

  if p_cylinder_type is null or btrim(p_cylinder_type) = '' then
    raise exception 'Cylinder type is required' using errcode = 'KX001';
  end if;

  if p_date is null then
    raise exception 'Date is required' using errcode = 'KX001';
  end if;

  if not exists (select 1 from public.parties where id = p_party_id) then
    -- No %: the id is an internal identifier, and this reaches the screen.
    raise exception 'That party no longer exists. Refresh and try again.'
      using errcode = 'KX001';
  end if;

  -- FOR UPDATE serialises concurrent callers on this row for the rest of the
  -- transaction, so the check below still holds when the decrement runs.
  select quantity into v_filled_available
  from public.stock
  where status = 'filled'
  for update;

  if v_filled_available is null or v_filled_available < p_filled_sent then
    raise exception 'Only % filled cylinder(s) in stock, cannot send %',
      coalesce(v_filled_available, 0), p_filled_sent
      using errcode = 'KX001';
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


-- 2. adjust_stock: same errcode treatment -------------------------------------
--
-- Behaviour is otherwise unchanged. The single UPDATE ... returning is already
-- atomic, so it needs no lock of its own.

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
    raise exception 'Adjustment amount is required' using errcode = 'KX001';
  end if;

  update public.stock
  set quantity = greatest(0, quantity + p_delta), updated_at = now()
  where status = p_status
  returning * into v_row;

  if not found then
    raise exception 'Unknown stock status %', p_status using errcode = 'KX001';
  end if;

  return v_row;
end;
$func$;

revoke execute on function public.adjust_stock(text, integer) from public, anon;
grant execute on function public.adjust_stock(text, integer) to authenticated;


-- 3. parties: close the INSERT side of the balance grant ----------------------
--
-- 0007 revoked table-level UPDATE and re-granted it column by column, which
-- stopped `update parties set balance = 9999`. It left INSERT alone — and a
-- table-level INSERT privilege covers every column, so
--
--   insert into parties (name, balance) values ('X', 9999)
--
-- still seeded the derived column to anything the client liked. The invariant
-- "balance moves only through create_transaction" was documented in
-- src/hooks/use-create-party.ts but not enforced anywhere.
--
-- The granted columns are exactly PartyInput in src/types/db.ts, so the app's
-- own insert is unaffected.

revoke insert on public.parties from authenticated, anon;
grant insert (name, contact, security_deposit) on public.parties to authenticated;
