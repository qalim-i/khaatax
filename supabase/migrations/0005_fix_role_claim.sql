-- FIX: the app role never reached the JWT, so every RLS policy denied everyone.
--
-- Migration 0003 wrote the app role into the top-level `role` claim. `role` is a
-- RESERVED claim in Supabase Auth: it carries the Postgres role PostgREST switches
-- to (`authenticated` / `anon`), and the Custom Access Token Hook is not permitted
-- to overwrite it. Even if it could, PostgREST would then attempt `SET ROLE owner`,
-- which is not a database role and would fail outright.
--
-- The observed effect on a signed-in owner was `auth.jwt() ->> 'role'` = 'authenticated',
-- which matches neither 'owner' nor 'manager'. Every policy from 0001 and 0004 that
-- tests that claim therefore denied every user:
--   * SELECT silently returned zero rows — the `stock` table, seeded with 5 rows by
--     0001, read back empty, so dashboards showed 0/₹0 as if there were no data.
--   * INSERT/UPDATE failed loudly with "new row violates row-level security policy".
--
-- Fix: carry the app role in a NON-reserved claim, `app_role`, and repoint every
-- policy at it. `role` is left alone for PostgREST.
--
-- AFTER RUNNING THIS: the hook must be enabled (Dashboard -> Authentication ->
-- Hooks -> Custom Access Token -> public.custom_access_token_hook), and every user
-- must sign out and back in — claims are stamped at token issue time, so existing
-- sessions keep the old, roleless token until they refresh.

-- 1. Hook: emit `app_role` instead of overwriting `role` -----------------------

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
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
$$;

grant usage on schema public to supabase_auth_admin;
grant select on table public.users to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- 2. Repoint every role-based policy at the new claim --------------------------

drop policy if exists "owner_and_manager_full_access" on parties;
create policy "owner_and_manager_full_access" on parties
  for all
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'))
  with check (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

drop policy if exists "owner_and_manager_full_access" on transactions;
create policy "owner_and_manager_full_access" on transactions
  for all
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'))
  with check (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

drop policy if exists "owner_and_manager_full_access" on stock;
create policy "owner_and_manager_full_access" on stock
  for all
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'))
  with check (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

drop policy if exists "owner_and_manager_full_access" on expenses;
create policy "owner_and_manager_full_access" on expenses
  for all
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'))
  with check (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

-- Staff directory read (added in 0004).
drop policy if exists "read_all_users" on users;
create policy "read_all_users" on users
  for select
  using (auth.jwt() ->> 'app_role' in ('owner', 'manager'));

-- Payroll: owner only. Still no policy for 'manager' — absence of a matching
-- policy means all access is denied by default under RLS
-- (CLAUDE.md Non-Negotiable Rule 1).
drop policy if exists "owner_full_access" on employees;
create policy "owner_full_access" on employees
  for all
  using (auth.jwt() ->> 'app_role' = 'owner')
  with check (auth.jwt() ->> 'app_role' = 'owner');

-- `read_own_user` is deliberately left as-is: it keys off auth.uid(), not the
-- role claim, which is why it kept working while everything else was denied.
