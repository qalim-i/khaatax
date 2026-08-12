-- Money outstanding per party: "Sharma Gases owes ₹12,500".
--
-- 0009 added `transactions.amount` and was explicit that it was NOT the start of
-- a receivables ledger — the figure was recorded and printed, and nothing added
-- it up. This migration reverses that decision deliberately, on request. Read
-- 0009's header alongside this one; the two disagree and this is the later word.
--
-- The thing that makes it a ledger rather than a running total is PAYMENTS. A
-- sum of amounts charged only ever grows, so "owes" would be meaningless without
-- a way to record money coming back in. Hence:
--
--   amount_due  =  sum(transactions.amount)  -  sum(payments.amount)
--
-- KhaataX is a khata: payments are recorded against the PARTY, not matched to a
-- specific invoice. There is no allocation, no partial-invoice settlement, no
-- aging of money (the aging report stays about cylinders — PRD INV-4). If
-- invoice-level settlement is ever wanted, that is a different feature and a
-- different schema; do not bolt it onto this one.
--
-- Two balances now exist per party and they are NOT interchangeable:
--
--   parties.balance      cylinders held by the party   (a count, migration 0001)
--   parties.amount_due   rupees owed by the party      (money, this migration)
--
-- Never render one where the other belongs. The Invoice prints both, labelled.
--
-- AFTER RUNNING THIS: run `npm run test:rls`.


-- 1. parties.amount_due --------------------------------------------------------
--
-- Cached on the party rather than summed on every read, exactly like `balance`,
-- and moved only inside the SECURITY DEFINER functions below so it cannot drift
-- from a client mistake. Both source rows survive (transactions.amount and
-- payments.amount), so it is always reconcilable — see the backfill below, which
-- is the same expression.
--
-- Deliberately NOT constrained to >= 0. A party who pays in advance, or overpays
-- a rounded bill, genuinely has a negative amount due, and that is a credit the
-- business owes them, not a data error. `balance` is unconstrained for the same
-- reason (0007 says so in as many words). The UI labels a negative as "in credit".

alter table public.parties
  add column if not exists amount_due numeric(12,2) not null default 0;

-- No new grant. 0007/0008 revoked table-level INSERT and UPDATE on parties and
-- re-granted them column by column (name, contact, security_deposit), so
-- amount_due is already unwritable by any client — same footing as `balance`.
-- This comment exists so a future column addition does not assume otherwise.


-- 2. payments ------------------------------------------------------------------
--
-- `amount > 0`: a payment is money in. A negative "payment" would be a charge,
-- and charges belong on a transaction where they get an invoice number. Letting
-- both signs through this table would make the ledger unauditable.
--
-- Immutable by design, like transactions — there is no UPDATE path. A payment
-- keyed in wrong is removed with delete_payment (which puts the money back on
-- amount_due) and re-recorded, so the ledger never has a silently edited row.

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  party_id     uuid not null references public.parties(id),
  date         date not null default current_date,
  amount       numeric(12,2) not null check (amount > 0),
  method       text not null default 'cash'
               check (method in ('cash','upi','bank','cheque','other')),
  note         text,
  created_by   uuid not null references public.users(id) default auth.uid(),
  created_at   timestamptz default now()
);

create index if not exists payments_party_date_idx
  on public.payments (party_id, date desc);

alter table public.payments enable row level security;

-- Readable by both roles; writable through the RPCs only, so no INSERT/UPDATE/
-- DELETE policy exists and all three are denied by default. Same shape as
-- `transactions` after 0007.
drop policy if exists "read_payments" on public.payments;
create policy "read_payments" on public.payments
  for select to authenticated
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

grant select on public.payments to authenticated;
revoke insert, update, delete on public.payments from authenticated, anon;
revoke all on public.payments from anon;


-- 3. Backfill ------------------------------------------------------------------
--
-- Every transaction written before 0009 carries amount 0, and no payments exist
-- yet, so in practice this sets amount_due to the sum of whatever has been
-- charged since 0009 was applied. Written as the full expression anyway: it is
-- the definition of the column, and it is what you re-run to reconcile.

update public.parties p
set amount_due = coalesce(
  (select sum(t.amount) from public.transactions t where t.party_id = p.id), 0
) - coalesce(
  (select sum(pay.amount) from public.payments pay where pay.party_id = p.id), 0
);


-- 4. create_transaction: the charge now moves amount_due -----------------------
--
-- This is the one behavioural change to 0009's function. Everything else is that
-- version verbatim: the FOR UPDATE lock on filled stock, NULL-safe sufficiency,
-- all validation ahead of nextval(), KX001 on user-facing messages.
--
-- The signature is unchanged, so unlike 0009 this migration does NOT have to
-- ship in lockstep with an app build. An older build keeps working; it simply
-- will not show the due figure.

create or replace function public.create_transaction(
  p_party_id uuid,
  p_date date,
  p_cylinder_type text,
  p_filled_sent integer,
  p_empty_received integer,
  p_amount numeric
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
  v_amount numeric(12,2);
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

  if p_amount is null then
    raise exception 'Amount charged is required' using errcode = 'KX001';
  end if;

  if p_amount < 0 then
    raise exception 'Amount charged cannot be negative' using errcode = 'KX001';
  end if;

  v_amount := round(p_amount, 2);

  if not exists (select 1 from public.parties where id = p_party_id) then
    raise exception 'That party no longer exists. Refresh and try again.'
      using errcode = 'KX001';
  end if;

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
    party_id, date, invoice_no, dc_no, cylinder_type,
    filled_sent, empty_received, amount, created_by
  ) values (
    p_party_id, p_date, v_invoice_no, v_dc_no, btrim(p_cylinder_type),
    p_filled_sent, p_empty_received, v_amount, auth.uid()
  )
  returning * into v_transaction;

  -- One statement, both balances: the cylinder count and the money owed move
  -- together or not at all, inside the same transaction as the insert above
  -- (Non-Negotiable Rule 3).
  update public.parties
  set balance    = balance + p_filled_sent - p_empty_received,
      amount_due = amount_due + v_amount
  where id = p_party_id;

  update public.stock set quantity = quantity - p_filled_sent, updated_at = now() where status = 'filled';
  update public.stock set quantity = quantity + p_filled_sent, updated_at = now() where status = 'at_customer';
  update public.stock set quantity = quantity + p_empty_received, updated_at = now() where status = 'empty';
  update public.stock set quantity = greatest(0, quantity - p_empty_received), updated_at = now() where status = 'at_customer';

  return v_transaction;
end;
$func$;

revoke execute on function public.create_transaction(uuid, date, text, integer, integer, numeric) from public, anon;
grant execute on function public.create_transaction(uuid, date, text, integer, integer, numeric) to authenticated;


-- 5. record_payment ------------------------------------------------------------
--
-- The other half of the ledger. Same shape as create_transaction and for the same
-- reasons: definer rights (the table has no client write grant), an explicit role
-- check standing in for the RLS that no longer applies, a pinned search_path, and
-- all validation before anything is written.
--
-- FOR UPDATE on the party row serialises concurrent payments against the same
-- party. Without it two managers recording ₹5,000 each could both read the same
-- amount_due and both write `read - 5000`, losing one of the two payments from
-- the balance while both rows sat in the table — the classic lost update, and on
-- money rather than stock.
--
-- An overpayment is allowed through: amount_due simply goes negative and the
-- party is in credit. Advances are ordinary in this business and rejecting them
-- would push the user into recording a fake charge to balance the books.

create or replace function public.record_payment(
  p_party_id uuid,
  p_date date,
  p_amount numeric,
  p_method text,
  p_note text
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_payment public.payments;
  v_amount numeric(12,2);
  v_method text;
begin
  if auth.jwt() ->> 'app_role' not in ('owner', 'manager') then
    raise exception 'Not authorised to record payments'
      using errcode = '42501';
  end if;

  if p_amount is null then
    raise exception 'Payment amount is required' using errcode = 'KX001';
  end if;

  v_amount := round(p_amount, 2);

  -- Checked after rounding: 0.004 is not a payment, and rounding it first stops
  -- a row that satisfies this guard from failing the column CHECK a line later.
  if v_amount <= 0 then
    raise exception 'A payment must be more than zero' using errcode = 'KX001';
  end if;

  if p_date is null then
    raise exception 'Date is required' using errcode = 'KX001';
  end if;

  v_method := coalesce(nullif(btrim(lower(p_method)), ''), 'cash');
  if v_method not in ('cash','upi','bank','cheque','other') then
    raise exception 'Unknown payment method' using errcode = 'KX001';
  end if;

  perform 1 from public.parties where id = p_party_id for update;
  if not found then
    raise exception 'That party no longer exists. Refresh and try again.'
      using errcode = 'KX001';
  end if;

  insert into public.payments (party_id, date, amount, method, note, created_by)
  values (p_party_id, p_date, v_amount, v_method, nullif(btrim(p_note), ''), auth.uid())
  returning * into v_payment;

  update public.parties
  set amount_due = amount_due - v_amount
  where id = p_party_id;

  return v_payment;
end;
$func$;

revoke execute on function public.record_payment(uuid, date, numeric, text, text) from public, anon;
grant execute on function public.record_payment(uuid, date, numeric, text, text) to authenticated;


-- 6. delete_payment ------------------------------------------------------------
--
-- The correction path. Payments have no UPDATE path on purpose, so a mis-keyed
-- figure is removed and re-recorded rather than quietly rewritten.
--
-- Deleting must put the money back on amount_due, which is exactly why this is an
-- RPC and not a DELETE grant: a plain delete would drop the row and leave the
-- cached balance overstating what was received, with nothing to notice it.
--
-- Scoped to the person who recorded it, or the owner — the same rule 0007 applied
-- to expenses, and for the same reason: attribution is worthless if any manager
-- can undo a colleague's entry.

create or replace function public.delete_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_payment public.payments;
begin
  if auth.jwt() ->> 'app_role' not in ('owner', 'manager') then
    raise exception 'Not authorised to remove payments'
      using errcode = '42501';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;

  if not found then
    raise exception 'That payment has already been removed.' using errcode = 'KX001';
  end if;

  if v_payment.created_by <> auth.uid() and auth.jwt() ->> 'app_role' <> 'owner' then
    raise exception 'Only the person who recorded a payment can remove it'
      using errcode = '42501';
  end if;

  delete from public.payments where id = p_payment_id;

  update public.parties
  set amount_due = amount_due + v_payment.amount
  where id = v_payment.party_id;
end;
$func$;

revoke execute on function public.delete_payment(uuid) from public, anon;
grant execute on function public.delete_payment(uuid) to authenticated;
