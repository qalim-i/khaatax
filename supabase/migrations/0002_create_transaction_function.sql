-- Atomic "New Transaction" write per docs/TRD.md Section 6.1.
-- invoice_no / dc_no are assigned here, server-side, from independent sequences —
-- never client-side (CLAUDE.md Non-Negotiable Rule 2). The whole write (transaction
-- insert, party balance update, stock update) happens in one function invocation,
-- which Postgres runs as a single atomic transaction (Rule 3).
--
-- security invoker (the default) so the calling user's RLS policies on parties/
-- transactions/stock still apply — this function does not bypass RLS.

create or replace function create_transaction(
  p_party_id uuid,
  p_date date,
  p_cylinder_type text,
  p_filled_sent integer,
  p_empty_received integer
)
returns transactions
language plpgsql
as $$
declare
  v_invoice_no integer;
  v_dc_no integer;
  v_transaction transactions;
begin
  if not exists (select 1 from parties where id = p_party_id) then
    raise exception 'Party % does not exist', p_party_id;
  end if;

  v_invoice_no := nextval('invoice_no_seq');
  v_dc_no := nextval('dc_no_seq');

  insert into transactions (
    party_id, date, invoice_no, dc_no, cylinder_type, filled_sent, empty_received, created_by
  ) values (
    p_party_id, p_date, v_invoice_no, v_dc_no, p_cylinder_type, p_filled_sent, p_empty_received, auth.uid()
  )
  returning * into v_transaction;

  update parties
  set balance = balance + p_filled_sent - p_empty_received
  where id = p_party_id;

  update stock set quantity = quantity - p_filled_sent, updated_at = now() where status = 'filled';
  update stock set quantity = quantity + p_filled_sent, updated_at = now() where status = 'at_customer';
  update stock set quantity = quantity + p_empty_received, updated_at = now() where status = 'empty';
  update stock set quantity = quantity - p_empty_received, updated_at = now() where status = 'at_customer';

  return v_transaction;
end;
$$;
