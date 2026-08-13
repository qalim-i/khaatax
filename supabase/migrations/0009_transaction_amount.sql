-- Amount charged per transaction.
--
-- Until now a transaction recorded only cylinder movement — how many filled went
-- out, how many empties came back — and `parties.balance` counted cylinders, not
-- money. Nothing anywhere recorded what the party was actually charged, so the
-- Invoice printed quantities and a deposit figure but no price.
--
-- This adds one manually-entered figure per transaction, stored on the row and
-- printed on both the Invoice and the Delivery Challan.
--
-- SCOPE, deliberately: `amount` is a recorded and printed figure only. It does
-- NOT create a monetary receivable — `parties.balance` stays a cylinder count
-- (TRD Section 3, and the Invoice note says so in as many words). No payment,
-- settlement, or money-outstanding tracking is implied, and none is built.
--
-- AFTER RUNNING THIS: run `npm run test:rls`. The RPC signature changed, so an
-- app build that sends p_amount will fail with "function does not exist" until
-- this is applied — apply it before shipping.


-- 1. The column ---------------------------------------------------------------
--
-- numeric(12,2): money, two decimal places, ceiling 9,999,999,999.99. Same family as
-- expenses.amount, but scaled — expenses.amount is bare `numeric` and inherits
-- whatever scale the client sends.
--
-- DEFAULT 0 backfills existing history. Those rows genuinely have no recorded
-- amount, and 0 is the only honest thing to put there; the documents print an em
-- dash rather than "₹0" for it, so an old invoice does not assert a free
-- delivery (see src/lib/pdf/documents.ts).
--
-- CHECK is NOT VALID for the same reason 0007's quantity checks are: this is
-- billing history. It constrains new writes without re-validating rows that were
-- written before the rule existed.

alter table public.transactions
  add column if not exists amount numeric(12,2) not null default 0;

alter table public.transactions
  add constraint transactions_amount_non_negative check (amount >= 0) not valid;


-- 2. create_transaction takes the amount --------------------------------------
--
-- The parameter is added rather than defaulted, so the old 5-argument signature
-- is dropped first. Leaving both in place would give PostgREST two candidates and
-- an ambiguous-function error on every call.
--
-- Everything else is 0008's body verbatim: the FOR UPDATE lock on the filled-stock
-- row, the NULL-safe sufficiency check, validation ahead of nextval(), KX001 on
-- messages meant for the user. Amount validation joins that pre-nextval() block,
-- so a bad amount still costs no invoice number.
--
-- `amount` does not touch the balance or stock arithmetic below it. It is
-- recorded, not accounted.

drop function if exists public.create_transaction(uuid, date, text, integer, integer);

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

  -- Amount. NULL is rejected rather than coerced to 0: a client that forgot the
  -- field would otherwise silently record a free delivery, and the figure ends up
  -- on a document the party is handed.
  if p_amount is null then
    raise exception 'Amount charged is required' using errcode = 'KX001';
  end if;

  if p_amount < 0 then
    raise exception 'Amount charged cannot be negative' using errcode = 'KX001';
  end if;

  -- Rounded here, not left to the column cast, so what the RPC returns to the app
  -- is exactly what was stored.
  v_amount := round(p_amount, 2);

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
    party_id, date, invoice_no, dc_no, cylinder_type,
    filled_sent, empty_received, amount, created_by
  ) values (
    p_party_id, p_date, v_invoice_no, v_dc_no, btrim(p_cylinder_type),
    p_filled_sent, p_empty_received, v_amount, auth.uid()
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

revoke execute on function public.create_transaction(uuid, date, text, integer, integer, numeric) from public, anon;
grant execute on function public.create_transaction(uuid, date, text, integer, integer, numeric) to authenticated;


-- 3. No new grant on the column ------------------------------------------------
--
-- Worth stating explicitly: `amount` is deliberately NOT added to any client
-- INSERT/UPDATE grant. 0007 revoked insert/update/delete on transactions
-- outright, and this column inherits that. It is writable only through the
-- definer-rights RPC above, exactly like invoice_no and filled_sent — otherwise
-- the figure on an issued invoice would be editable after the fact.
