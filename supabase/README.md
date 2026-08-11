# Supabase Setup

## 1. Create a project

Create a project at [supabase.com](https://supabase.com/dashboard) (Development environment — see `TRD.md` Section 8 for the Dev/Prod split). Note the **Project URL** and **anon public key** from Settings → API.

## 2. Run the migrations

In the Supabase dashboard's **SQL Editor**, run the files in `migrations/` **in order**:

1. `0001_initial_schema.sql` — tables, sequences, RLS policies
2. `0002_create_transaction_function.sql` — the atomic New Transaction RPC
3. `0003_role_claim_hook.sql` — the function that projects `role` onto the JWT

## 3. Enable the Custom Access Token Hook

Migration `0003` only creates the function — Supabase won't call it until you wire it up:

1. Dashboard → **Authentication** → **Hooks**
2. Under **Custom Access Token**, select `public.custom_access_token_hook`
3. Save

Without this step, `auth.jwt() ->> 'role'` is always null and every RLS policy in `0001` will deny access — including to the owner.

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
