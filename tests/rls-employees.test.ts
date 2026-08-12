/**
 * Payroll isolation test — CLAUDE.md Non-Negotiable Rule 1, TRD Section 9.
 *
 * Proves at the API layer that a *manager* session cannot read or write
 * `employees`, and that an *owner* session can. This runs against a real
 * Supabase project because RLS is the thing under test — mocking the client
 * would prove nothing.
 *
 * Required environment (point these at the DEVELOPMENT project, never Production):
 *
 *   EXPO_PUBLIC_SUPABASE_URL        already in .env
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY   already in .env
 *   KHAATAX_TEST_OWNER_EMAIL        an owner-role account
 *   KHAATAX_TEST_OWNER_PASSWORD
 *   KHAATAX_TEST_MANAGER_EMAIL      a manager-role account
 *   KHAATAX_TEST_MANAGER_PASSWORD
 *
 * Run with: npm run test:rls
 *
 * If the credentials are absent the suite fails rather than skipping. A silent
 * skip on the one test that guards payroll would be worse than no test at all —
 * it would go green in CI while proving nothing.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const OWNER_EMAIL = process.env.KHAATAX_TEST_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.KHAATAX_TEST_OWNER_PASSWORD;
const MANAGER_EMAIL = process.env.KHAATAX_TEST_MANAGER_EMAIL;
const MANAGER_PASSWORD = process.env.KHAATAX_TEST_MANAGER_PASSWORD;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. The payroll RLS test cannot run without real credentials — ` +
        'see the header of tests/rls-employees.test.ts.'
    );
  }
  return value;
}

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(
    requireEnv('EXPO_PUBLIC_SUPABASE_URL', SUPABASE_URL),
    requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', SUPABASE_ANON_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);
  return client;
}

describe('employees RLS', () => {
  let manager: SupabaseClient;
  let owner: SupabaseClient;

  beforeAll(async () => {
    manager = await signIn(
      requireEnv('KHAATAX_TEST_MANAGER_EMAIL', MANAGER_EMAIL),
      requireEnv('KHAATAX_TEST_MANAGER_PASSWORD', MANAGER_PASSWORD)
    );
    owner = await signIn(
      requireEnv('KHAATAX_TEST_OWNER_EMAIL', OWNER_EMAIL),
      requireEnv('KHAATAX_TEST_OWNER_PASSWORD', OWNER_PASSWORD)
    );
  }, 30_000);

  afterAll(async () => {
    // `scope: 'local'` matters. signOut() defaults to global scope, which revokes
    // every session for that user — including the developer's own browser session
    // in the running app, which then can't refresh and has to sign in again.
    // Local scope tears down only the session this test created.
    await manager?.auth.signOut({ scope: 'local' });
    await owner?.auth.signOut({ scope: 'local' });
  });

  // ---------------------------------------------------------------------------
  // Controls. Without these, every manager assertion below would also pass on a
  // project where RLS denies *everyone* — green for entirely the wrong reason.
  // Each control isolates a different failure so the message says what to fix.
  // ---------------------------------------------------------------------------

  it("owner's JWT carries app_role=owner", async () => {
    const { data } = await owner.auth.getSession();
    const token = data.session?.access_token;
    expect(token).toBeTruthy();

    const claims = JSON.parse(
      Buffer.from(token!.split('.')[1], 'base64url').toString('utf8')
    ) as Record<string, unknown>;

    // If this is 'authenticated' or undefined, the Custom Access Token Hook is
    // not attaching the role: run migration 0005, enable the hook in the
    // dashboard, then sign out and back in. Every role-based policy denies all
    // users until this claim is right — see supabase/README.md.
    expect(claims.app_role).toBe('owner');
  });

  it('owner can read a seeded table (proves policies evaluate, not just connect)', async () => {
    // 0001 seeds exactly five rows into `stock`. Reading zero back means RLS is
    // filtering them out, not that the table is empty.
    const { data, error } = await owner.from('stock').select('status');

    expect(error).toBeNull();
    expect(data).toHaveLength(5);
  });

  it('owner has real write access to employees (distinguishes denied from empty)', async () => {
    // A plain SELECT can't tell "policy denies me" from "table is empty" — both
    // return []. Writing a row and reading it back proves access unambiguously.
    // Cleaned up in `finally` so a mid-test failure can't leave a probe row on
    // the payroll list.
    const probeName = `__rls_probe_${Date.now()}`;
    let insertedId: string | undefined;

    try {
      const { data: inserted, error: insertError } = await owner
        .from('employees')
        .insert({ name: probeName, role: 'probe', monthly_pay: 0 })
        .select()
        .single();

      expect(insertError).toBeNull();
      insertedId = (inserted as { id: string } | null)?.id;
      expect(insertedId).toBeTruthy();

      const { data: readBack, error: readError } = await owner
        .from('employees')
        .select('name')
        .eq('name', probeName);

      expect(readError).toBeNull();
      expect(readBack).toHaveLength(1);
    } finally {
      if (insertedId) await owner.from('employees').delete().eq('id', insertedId);
    }
  });

  it('manager SELECT returns zero rows', async () => {
    const { data, error } = await manager.from('employees').select('*');

    // RLS filters rather than erroring: the query succeeds and returns nothing.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('manager cannot count employees', async () => {
    const { count, error } = await manager
      .from('employees')
      .select('*', { count: 'exact', head: true });

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('manager cannot read pay even when selecting a single column', async () => {
    const { data, error } = await manager.from('employees').select('monthly_pay');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('manager INSERT is rejected', async () => {
    const { error } = await manager
      .from('employees')
      .insert({ name: 'RLS probe', role: 'probe', monthly_pay: 1 });

    expect(error).not.toBeNull();
  });

  it('manager UPDATE affects no rows', async () => {
    const { data, error } = await manager
      .from('employees')
      .update({ monthly_pay: 1 })
      .neq('name', '')
      .select();

    // Either the policy rejects it outright or it matches nothing. Both are fine;
    // silently updating a row is not.
    if (error === null) expect(data).toEqual([]);
  });

  it('manager DELETE affects no rows', async () => {
    const { data, error } = await manager.from('employees').delete().neq('name', '').select();

    if (error === null) expect(data).toEqual([]);
  });
});
