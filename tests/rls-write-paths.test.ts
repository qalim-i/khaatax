/**
 * Write-path isolation — the boundaries added by migration 0007.
 *
 * The payroll suite (rls-employees.test.ts) proves managers cannot reach the
 * `employees` table. This one proves the other half: that the rules CLAUDE.md
 * calls non-negotiable are enforced by the DATABASE and not merely by the client
 * choosing to behave.
 *
 * Before 0007 every assertion in this file failed. A signed-in manager could POST
 * straight to /rest/v1/transactions with a hand-picked `invoice_no`, skip the
 * balance and stock updates entirely, and attribute the row to somebody else —
 * because `useCreateTransaction` calling the RPC was the only thing stopping
 * them, and an attacker does not have to use the app.
 *
 * Like the payroll suite this runs against a real project (see ./support/clients
 * for the guard that keeps it off the app's own project) and fails rather than
 * skips when credentials are missing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { signInAsManager, signInAsOwner, signOutAll } from './support/clients';

/** PostgREST surfaces a missing table/column GRANT as 42501. */
function isPermissionDenied(
  error: { code?: string | null; message?: string | null } | null
): boolean {
  if (!error) return false;
  return (
    error.code === '42501' ||
    /permission denied|violates row-level security/i.test(error.message ?? '')
  );
}

describe('write-path RLS (migration 0007)', () => {
  let manager: SupabaseClient;
  let owner: SupabaseClient;
  let managerId: string;
  let ownerId: string;

  beforeAll(async () => {
    manager = await signInAsManager();
    owner = await signInAsOwner();

    managerId = (await manager.auth.getUser()).data.user!.id;
    ownerId = (await owner.auth.getUser()).data.user!.id;

    expect(managerId).toBeTruthy();
    expect(ownerId).toBeTruthy();
  }, 30_000);

  afterAll(async () => {
    await signOutAll(manager, owner);
  });

  // ---------------------------------------------------------------------------
  // transactions — Non-Negotiable Rules 2 and 3.
  //
  // The RPC is now the only way in. If any of these start passing, invoice
  // numbers are forgeable again and the balance/stock update is skippable.
  // ---------------------------------------------------------------------------

  it('manager cannot insert a transaction directly with a chosen invoice number', async () => {
    const { error } = await manager.from('transactions').insert({
      party_id: '00000000-0000-0000-0000-000000000000',
      date: '2026-01-01',
      invoice_no: 999_999,
      dc_no: 999_999,
      cylinder_type: 'probe',
      filled_sent: 1,
      empty_received: 0,
      created_by: ownerId,
    });

    // Must be a permission failure, not a foreign-key complaint about the party:
    // an FK error would mean the write was authorised and merely malformed.
    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  it('manager cannot update an existing transaction', async () => {
    const { error } = await manager
      .from('transactions')
      .update({ invoice_no: 1 })
      .eq('invoice_no', 201);

    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  it('manager cannot delete a transaction', async () => {
    const { error } = await manager.from('transactions').delete().eq('invoice_no', 201);

    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  it('owner cannot insert a transaction directly either', async () => {
    // The rule is about the write PATH, not about privilege. Even the owner goes
    // through the RPC, or invoice numbering stops being sequence-generated.
    const { error } = await owner.from('transactions').insert({
      party_id: '00000000-0000-0000-0000-000000000000',
      date: '2026-01-01',
      invoice_no: 999_998,
      dc_no: 999_998,
      cylinder_type: 'probe',
      filled_sent: 1,
      empty_received: 0,
    });

    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // stock
  // ---------------------------------------------------------------------------

  it('manager cannot write stock quantities directly', async () => {
    const { error } = await manager.from('stock').update({ quantity: 9_999 }).eq('status', 'filled');

    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  it('adjust_stock applies a delta and leaves the total where it found it', async () => {
    // Positive control: proves the SECURITY DEFINER path still works for a
    // manager, so the tests above are failing on the path and not on the role.
    const before = await manager.from('stock').select('quantity').eq('status', 'damaged').single();
    const start = (before.data as { quantity: number }).quantity;

    const up = await manager.rpc('adjust_stock', { p_status: 'damaged', p_delta: 1 });
    expect(up.error).toBeNull();
    expect((up.data as { quantity: number }).quantity).toBe(start + 1);

    const down = await manager.rpc('adjust_stock', { p_status: 'damaged', p_delta: -1 });
    expect(down.error).toBeNull();
    expect((down.data as { quantity: number }).quantity).toBe(start);
  });

  it('adjust_stock rejects an unknown status', async () => {
    const { error } = await manager.rpc('adjust_stock', { p_status: 'not_a_status', p_delta: 1 });
    expect(error).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // create_transaction validation.
  //
  // None of these write anything, deliberately. A successful call cannot be
  // cleaned up — DELETE on `transactions` is revoked for everyone — and it would
  // consume an invoice number from a legally-sequenced series on every run.
  // ---------------------------------------------------------------------------

  const MISSING_PARTY = '00000000-0000-0000-0000-000000000000';

  it('create_transaction rejects negative quantities', async () => {
    const { error } = await manager.rpc('create_transaction', {
      p_party_id: MISSING_PARTY,
      p_date: '2026-01-01',
      p_cylinder_type: 'probe',
      p_filled_sent: -100,
      p_empty_received: 0,
    });

    // Negative quantities used to run the function backwards: stock went UP and
    // the party's balance went DOWN, inventing inventory and erasing receivables.
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/zero or more/i);
  });

  it('create_transaction rejects a movement of zero cylinders', async () => {
    const { error } = await manager.rpc('create_transaction', {
      p_party_id: MISSING_PARTY,
      p_date: '2026-01-01',
      p_cylinder_type: 'probe',
      p_filled_sent: 0,
      p_empty_received: 0,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/at least one cylinder/i);
  });

  it('create_transaction rejects a blank cylinder type', async () => {
    const { error } = await manager.rpc('create_transaction', {
      p_party_id: MISSING_PARTY,
      p_date: '2026-01-01',
      p_cylinder_type: '   ',
      p_filled_sent: 1,
      p_empty_received: 0,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/cylinder type is required/i);
  });

  it('create_transaction validates before it reaches the party check', async () => {
    // Ordering matters: every check above must run before nextval(). Sequences
    // are non-transactional, so a failure after nextval() burns an invoice number
    // permanently and leaves a gap nothing can close. Reaching the party error
    // means validation passed and the sequence was still untouched.
    const { error } = await manager.rpc('create_transaction', {
      p_party_id: MISSING_PARTY,
      p_date: '2026-01-01',
      p_cylinder_type: 'probe',
      p_filled_sent: 1,
      p_empty_received: 0,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/party no longer exists/i);
    // 0008 stopped interpolating the id into this message: it reaches the screen
    // verbatim (errors.ts passes KX001 through), and an internal uuid is neither
    // actionable nor ours to disclose.
    expect(error!.message).not.toContain(MISSING_PARTY);
  });

  // ---------------------------------------------------------------------------
  // expenses — attribution (TRD auditability requirement).
  // ---------------------------------------------------------------------------

  it('manager cannot log an expense under another user', async () => {
    const { error } = await manager.from('expenses').insert({
      date: '2026-01-01',
      amount: 1,
      category: 'Misc',
      note: '__rls_probe_forged_attribution',
      created_by: ownerId,
    });

    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  it('expenses are attributed to the caller by the server', async () => {
    const note = `__rls_probe_attribution_${Date.now()}`;
    let insertedId: string | undefined;

    try {
      const { data, error } = await manager
        .from('expenses')
        .insert({ date: '2026-01-01', amount: 1, category: 'Misc', note })
        .select()
        .single();

      expect(error).toBeNull();

      const row = data as { id: string; created_by: string };
      insertedId = row.id;
      expect(row.created_by).toBe(managerId);
    } finally {
      if (insertedId) await manager.from('expenses').delete().eq('id', insertedId);
    }
  });

  // ---------------------------------------------------------------------------
  // parties — `balance` is derived, not editable.
  // ---------------------------------------------------------------------------

  it('manager can create and rename a party but cannot set its balance', async () => {
    const name = `__rls_probe_party_${Date.now()}`;
    let partyId: string | undefined;

    try {
      const { data, error: insertError } = await manager
        .from('parties')
        .insert({ name, contact: null, security_deposit: 0 })
        .select()
        .single();

      expect(insertError).toBeNull();
      partyId = (data as { id: string }).id;

      // Positive control: ordinary columns are still writable.
      const rename = await manager.from('parties').update({ name: `${name}_x` }).eq('id', partyId!);
      expect(rename.error).toBeNull();

      // The derived column is not.
      const tamper = await manager.from('parties').update({ balance: 9_999 }).eq('id', partyId!);
      expect(tamper.error).not.toBeNull();
      expect(isPermissionDenied(tamper.error)).toBe(true);

      const { data: readBack } = await owner
        .from('parties')
        .select('balance')
        .eq('id', partyId!)
        .single();

      expect((readBack as { balance: number }).balance).toBe(0);
    } finally {
      if (partyId) await manager.from('parties').delete().eq('id', partyId);
    }
  });

  it('manager cannot seed a balance when creating a party', async () => {
    // 0007 locked `balance` out of the UPDATE grant but left INSERT at table
    // level, and a table-level privilege covers every column — so the derived
    // column was still settable at creation, just not afterwards. 0008 scopes
    // INSERT to the same three columns as UPDATE.
    const name = `__rls_probe_party_seed_${Date.now()}`;
    let partyId: string | undefined;

    try {
      const { data, error } = await manager
        .from('parties')
        .insert({ name, contact: null, security_deposit: 0, balance: 9_999 })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(isPermissionDenied(error)).toBe(true);
      partyId = (data as { id: string } | null)?.id;
    } finally {
      if (partyId) await manager.from('parties').delete().eq('id', partyId);
    }
  });
});
