-- FIX (follow-up to 0005): the hook could not read the role it was meant to attach.
--
-- 0005 moved the claim to `app_role` and repointed every policy, which was correct
-- but not sufficient — the claim still never appeared on the JWT.
--
-- The Custom Access Token Hook executes as `supabase_auth_admin`, and
-- `public.users` has RLS enabled (0001). A table-level GRANT does not exempt a
-- role from RLS; the two are independent. Neither existing policy lets the auth
-- admin through:
--
--   * `read_own_user`  -> `id = auth.uid()`, and auth.uid() is NULL inside the
--                         hook (there is no end-user session yet), so no rows.
--   * `read_all_users` -> requires `app_role`, which is precisely the claim the
--                         hook is trying to produce. Circular.
--
-- So `select role into user_role` returned NULL, and the hook's
-- `if user_role is not null` guard silently attached nothing. Sign-in kept working
-- and the token looked normal — it just had no `app_role`, so every role-based
-- policy denied every user.
--
-- Fix: an explicit permissive SELECT policy for `supabase_auth_admin`. Scoped with
-- `to supabase_auth_admin` so it grants nothing to end users — `authenticated`
-- still sees `users` only through `read_own_user` / `read_all_users`.
--
-- AFTER RUNNING THIS: sign out and back in. Claims are stamped at token issue
-- time, so an existing session keeps its roleless token until it refreshes.

grant usage on schema public to supabase_auth_admin;
grant select on table public.users to supabase_auth_admin;

drop policy if exists "auth_admin_can_read_user_roles" on public.users;
create policy "auth_admin_can_read_user_roles" on public.users
  as permissive
  for select
  to supabase_auth_admin
  using (true);

-- Verify (expects one row with the app role, run in the SQL editor):
--   set role supabase_auth_admin;
--   select id, role from public.users limit 5;
--   reset role;
