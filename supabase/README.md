# Supabase Setup

## 1. Create a project

Create a project at [supabase.com](https://supabase.com/dashboard) (Development environment — see `TRD.md` Section 8 for the Dev/Prod split). Note the **Project URL** and **anon public key** from Settings → API.

## 2. Run the migrations

In the Supabase dashboard's **SQL Editor**, run the files in `migrations/` **in order**:

1. `0001_initial_schema.sql` — tables, sequences, RLS policies
2. `0002_create_transaction_function.sql` — the atomic New Transaction RPC
3. `0003_role_claim_hook.sql` — the function that projects `role` onto the JWT
4. `0004_expense_reporting.sql` — staff-directory read policy on `users`, plus reporting indexes
5. `0005_fix_role_claim.sql` — **required.** Moves the app role onto a non-reserved `app_role` JWT claim and repoints every RLS policy at it. Without this the policies deny every user (see Troubleshooting below).
6. `0006_auth_admin_reads_roles.sql` — **required.** Lets `supabase_auth_admin` read `public.users` so the hook can actually find the role. `0005` alone is not enough: the hook is subject to RLS and would silently attach no claim.

## 3. Enable the Custom Access Token Hook

Migration `0003` only creates the function — Supabase won't call it until you wire it up:

1. Dashboard → **Authentication** → **Hooks**
2. Under **Custom Access Token**, select `public.custom_access_token_hook`
3. Save

Without this step, `auth.jwt() ->> 'app_role'` is always null and every RLS policy will deny access — including to the owner.

**Sign out and back in after enabling it.** Claims are stamped when the token is
issued, so an existing session keeps its old, roleless token until it refreshes.

## Troubleshooting: everything reads as zero

If the app loads and every figure is `0` / `₹0`, and saving anything fails with
`new row violates row-level security policy`, the role claim is not reaching the
JWT. Reads fail *silently* under RLS (zero rows) while writes fail loudly, so an
empty-looking app is the symptom, not "no data yet".

Check it directly — this should print `owner` or `manager`, not `authenticated`:

```sql
select auth.jwt() ->> 'app_role';
```

Common causes, in order:

1. Migration `0005` has not been run. Before it, the hook wrote the app role into
   the reserved `role` claim, which Supabase does not allow it to overwrite — so
   the claim stayed `authenticated` and every policy denied everyone.
2. Migration `0006` has not been run. The hook runs as `supabase_auth_admin`,
   which is itself subject to RLS on `public.users` — a table GRANT is not enough.
   Without the policy `0006` adds, the hook's role lookup returns NULL and it
   attaches no claim at all, silently. Symptom: `app_role` is *missing* from the
   JWT rather than wrong.

   Check with:

   ```sql
   set role supabase_auth_admin;
   select id, role from public.users limit 5;  -- 0 rows means 0006 is missing
   reset role;
   ```

3. The Custom Access Token Hook is not enabled (step 3 above).
4. The session predates the fix — sign out and back in. This is required after
   *every* change above; tokens are only stamped at issue time.
5. The signed-in user has no row in `public.users` (step 4 below), so the hook
   finds no role to attach.

## 4. Create your first users

Manager accounts are provisioned by the developer, not self-service (CLAUDE.md). For each person (at least one `owner`):

1. Dashboard → **Authentication** → **Users** → **Add user** → set email + password, copy the generated **User UID**
2. SQL Editor:
   ```sql
   insert into public.users (id, name, role)
   values ('<the User UID from step 1>', 'Jane Doe', 'owner');
   ```
   Use `'manager'` for manager accounts.
3. **Sign out and back in** (or just sign in fresh) after inserting the `users` row — the JWT is only stamped with the role claim at sign-in time, so a row added after a session started won't apply until the next login.

## 5. Point the app at the project

Edit `.env` (not committed) at the repo root:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Restart `expo start` after editing `.env` — Expo only reads it at boot.

## 6. Verify the payroll boundary

Before trusting the app, confirm the RLS boundary actually holds (TRD Section 9 requires this as a test, not just a UI check):

```sql
-- Run as the manager's JWT (or via the API with a manager session) — should return 0 rows
select * from employees;
```

If a manager account can read `employees`, stop and check the hook is enabled (step 3) and the `employees` table has no stray manager-accessible policy.

### Automated check

The repo ships this as a test (`tests/rls-employees.test.ts`). Add owner and
manager credentials for **this development project** to `.env` — see the
`KHAATAX_TEST_*` keys in `.env.example` — then:

```bash
npm run test:rls
```

It asserts a manager gets zero rows from SELECT/count/single-column reads and is
blocked from INSERT/UPDATE/DELETE, and separately that the *owner* can read the
table — without that control the whole suite would pass against a misconfigured
project and prove nothing. The test fails rather than skips when credentials are
missing, so it cannot go green without actually running.
