-- Phase 2 support: Outstanding Report + Expense module.
--
-- Two changes: a read policy on `users` needed by the expense "logged by" filter,
-- and indexes for the date-ranged scans the new reports run.

-- 1. Staff directory read access -------------------------------------------
--
-- PRD EXP-5 requires filtering expenses by who logged them, and the expense list
-- shows the logger's name. Both need to resolve `expenses.created_by` to a name,
-- but the only policy on `users` so far is `read_own_user` (id = auth.uid()), so
-- every row logged by someone else resolves to nothing.
--
-- This grants owner and manager SELECT on `users`. Scope note: `users` holds only
-- id, name and role — no pay, no contact details. Compensation lives in
-- `employees`, whose owner-only policy is untouched by this migration, so the
-- payroll boundary (CLAUDE.md Non-Negotiable Rule 1) is unaffected. Managers
-- already know their 2-3 colleagues by name; this is a staff directory, not a
-- disclosure. SELECT only — no manager can write to `users`.

create policy "read_all_users" on users
  for select
  using (auth.jwt() ->> 'role' in ('owner', 'manager'));

-- 2. Indexes ---------------------------------------------------------------
--
-- The expense dashboard scans by date (today / MTD / YTD / 12-month trend) and
-- the Outstanding Report walks every transaction for a party in date order.
-- Volumes are low (TRD Section 7) but these are the only repeated range scans in
-- the app, and they cost nothing to add now.

create index expenses_date_idx on expenses (date desc);
create index expenses_category_idx on expenses (category);
create index expenses_created_by_idx on expenses (created_by);
create index transactions_party_date_idx on transactions (party_id, date);
