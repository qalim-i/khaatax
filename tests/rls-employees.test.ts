/**
 * Payroll isolation test — CLAUDE.md Non-Negotiable Rule 1, TRD Section 9.
 *
 * Proves at the API layer that a *manager* session cannot read or write
 * `employees`, and that an *owner* session can. This runs against a real
 * Supabase project because RLS is the thing under test — mocking the client
 * would prove nothing.
 *
 * Credentials, the guard against running this on the app's own project, and the
 * sign-in/sign-out plumbing all live in ./support/clients.
 *
 * Run with: npm run test:rls
 *
 * If the credentials are absent the suite fails rather than skipping. A silent
 * skip on the one test that guards payroll would be worse than no test at all —
 * it would go green in CI while proving nothing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { signInAsManager, signInAsOwner, signOutAll } from './support/clients';

describe('employees RLS', () => {
  let manager: SupabaseClient;
  let owner: SupabaseClient;

  beforeAll(async () => {
    manager = await signInAsManager();
    owner = await signInAsOwner();
  }, 30_000);

  afterAll(async () => {
    await signOutAll(manager, owner);
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
    const probeName = `__rls_probe_insert_${Date.now()}`;

    try {
      const { error } = await manager
        .from('employees')
        .insert({ name: probeName, role: 'probe', monthly_pay: 1 });

      expect(error).not.toBeNull();
    } finally {
      const { error: cleanupError } = await owner
        .from('employees')
        .delete()
        .eq('name', probeName);

      expect(cleanupError).toBeNull();
    }
  });

  it('manager UPDATE affects no rows', async () => {
    const probeName = `__rls_probe_update_${Date.now()}`;
    let probeId: string | undefined;

    try {
      const { data: inserted, error: insertError } = await owner
        .from('employees')
        .insert({ name: probeName, role: 'probe', monthly_pay: 0 })
        .select()
        .single();

      expect(insertError).toBeNull();
      probeId = (inserted as { id: string } | null)?.id;
      expect(probeId).toBeTruthy();

      const { data, error } = await manager
        .from('employees')
        .update({ monthly_pay: 1 })
        .eq('id', probeId!)
        .select();

      // Either the policy rejects it outright or it matches nothing. Both are fine;
      // silently updating a row is not.
      if (error === null) expect(data).toEqual([]);

      const { data: readBack, error: readError } = await owner
        .from('employees')
        .select('monthly_pay')
        .eq('id', probeId!)
        .single();

      expect(readError).toBeNull();
      expect((readBack as { monthly_pay: number } | null)?.monthly_pay).toBe(0);
    } finally {
      if (probeId) {
        const { error: cleanupError } = await owner.from('employees').delete().eq('id', probeId);
        expect(cleanupError).toBeNull();
      }
    }
  });

  it('manager DELETE affects no rows', async () => {
    const probeName = `__rls_probe_delete_${Date.now()}`;
    let probeId: string | undefined;

    try {
      const { data: inserted, error: insertError } = await owner
        .from('employees')
        .insert({ name: probeName, role: 'probe', monthly_pay: 5 })
        .select()
        .single();

      expect(insertError).toBeNull();
      probeId = (inserted as { id: string } | null)?.id;
      expect(probeId).toBeTruthy();

      const { data, error } = await manager.from('employees').delete().eq('id', probeId!).select();

      if (error === null) expect(data).toEqual([]);

      const { data: row, error: readError } = await owner
        .from('employees')
        .select('name, monthly_pay')
        .eq('id', probeId!)
        .single();

      expect(readError).toBeNull();
      expect(row).toMatchObject({ name: probeName, monthly_pay: 5 });
    } finally {
      if (probeId) {
        const { error: cleanupError } = await owner.from('employees').delete().eq('id', probeId);
        expect(cleanupError).toBeNull();
      }
    }
  });
});
