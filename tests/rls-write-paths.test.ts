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
      p_amount: 100,
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
      p_amount: 100,
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
      p_amount: 100,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/cylinder type is required/i);
  });

  it('create_transaction rejects a negative amount', async () => {
    // migration 0009. The figure is printed on a document handed to the party,
    // so a negative charge is not a correction — it is a nonsense bill.
    const { error } = await manager.rpc('create_transaction', {
      p_party_id: MISSING_PARTY,
      p_date: '2026-01-01',
      p_cylinder_type: 'probe',
      p_filled_sent: 1,
      p_empty_received: 0,
      p_amount: -100,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/amount charged cannot be negative/i);
  });

  it('create_transaction rejects a missing amount rather than defaulting it to zero', async () => {
    // A client that forgot the field would otherwise silently record a free
    // delivery — which is why p_amount has no DEFAULT and NULL is an error.
    const { error } = await manager.rpc('create_transaction', {
      p_party_id: MISSING_PARTY,
      p_date: '2026-01-01',
      p_cylinder_type: 'probe',
      p_filled_sent: 1,
      p_empty_received: 0,
      p_amount: null,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/amount charged is required/i);
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
      p_amount: 100,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/party no longer exists/i);
    // 0008 stopped interpolating the id into this message: it reaches the screen
    // verbatim (errors.ts passes KX001 through), and an internal uuid is neither
    // actionable nor ours to disclose.
    expect(error!.message).not.toContain(MISSING_PARTY);
  });

  // ---------------------------------------------------------------------------
  // payments and the receivables ledger — migration 0010.
  //
  // `parties.amount_due` is cached money. If a client can write either the
  // payments table or the column directly, the two can disagree and nothing in
  // the system would notice — so both are closed and record_payment is the only
  // way in, exactly as create_transaction is for transactions.
  // ---------------------------------------------------------------------------

  it('manager cannot insert a payment directly', async () => {
    const { error } = await manager.from('payments').insert({
      party_id: MISSING_PARTY,
      date: '2026-01-01',
      amount: 500,
      method: 'cash',
    });

    // A permission failure, not a foreign-key complaint: an FK error would mean
    // the write was authorised and merely pointed at a missing party.
    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  it('manager cannot delete a payment directly', async () => {
    // Deleting the row without the RPC would leave amount_due overstating what
    // was received, with nothing to reconcile it.
    const { error } = await manager
      .from('payments')
      .delete()
      .eq('id', '00000000-0000-0000-0000-000000000000');

    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  it('manager cannot set a party amount_due, at creation or afterwards', async () => {
    const name = `__rls_probe_due_${Date.now()}`;
    let partyId: string | undefined;

    try {
      // 0008 scoped the INSERT grant to (name, contact, security_deposit), so
      // amount_due — added later — is excluded by construction. This proves it.
      const seeded = await manager
        .from('parties')
        .insert({ name, contact: null, security_deposit: 0, amount_due: 9_999 })
        .select()
        .single();

      expect(seeded.error).not.toBeNull();
      expect(isPermissionDenied(seeded.error)).toBe(true);

      const { data, error: insertError } = await manager
        .from('parties')
        .insert({ name, contact: null, security_deposit: 0 })
        .select()
        .single();

      expect(insertError).toBeNull();
      partyId = (data as { id: string }).id;
      expect((data as { amount_due: number }).amount_due).toBe(0);

      const tamper = await manager
        .from('parties')
        .update({ amount_due: 9_999 })
        .eq('id', partyId!);

      expect(tamper.error).not.toBeNull();
      expect(isPermissionDenied(tamper.error)).toBe(true);
    } finally {
      if (partyId) await manager.from('parties').delete().eq('id', partyId);
    }
  });

  it('record_payment moves the money and delete_payment puts it back', async () => {
    // The positive control for the whole ledger: it proves the assertions above
    // fail on the PATH rather than on the role, and that the cached column and
    // the payment row stay in step in both directions.
    const name = `__rls_probe_payment_${Date.now()}`;
    let partyId: string | undefined;
    let paymentId: string | undefined;

    try {
      const { data: created, error: createError } = await manager
        .from('parties')
        .insert({ name, contact: null, security_deposit: 0 })
        .select()
        .single();

      expect(createError).toBeNull();
      partyId = (created as { id: string }).id;

      const paid = await manager.rpc('record_payment', {
        p_party_id: partyId,
        p_date: '2026-01-01',
        p_amount: 1500.5,
        p_method: 'upi',
        p_note: '__rls_probe',
      });

      expect(paid.error).toBeNull();
      const payment = paid.data as { id: string; amount: number; created_by: string };
      paymentId = payment.id;
      expect(Number(payment.amount)).toBe(1500.5);
      // Attribution is stamped by the server, not sent by the client.
      expect(payment.created_by).toBe(managerId);

      const afterPayment = await manager
        .from('parties')
        .select('amount_due')
        .eq('id', partyId!)
        .single();

      // No charges on this party, so paying leaves it in credit — a negative
      // amount_due is a real state, not an error.
      expect(Number((afterPayment.data as { amount_due: number }).amount_due)).toBe(-1500.5);

      const removed = await manager.rpc('delete_payment', { p_payment_id: paymentId });
      expect(removed.error).toBeNull();
      paymentId = undefined;

      const afterDelete = await manager
        .from('parties')
        .select('amount_due')
        .eq('id', partyId!)
        .single();

      expect(Number((afterDelete.data as { amount_due: number }).amount_due)).toBe(0);
    } finally {
      if (paymentId) await manager.rpc('delete_payment', { p_payment_id: paymentId });
      if (partyId) await manager.from('parties').delete().eq('id', partyId);
    }
  });

  it('record_payment rejects a zero or negative payment', async () => {
    for (const amount of [0, -500]) {
      const { error } = await manager.rpc('record_payment', {
        p_party_id: MISSING_PARTY,
        p_date: '2026-01-01',
        p_amount: amount,
        p_method: 'cash',
        p_note: null,
      });

      // A negative "payment" is a charge, and charges belong on a transaction
      // where they get an invoice number.
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/more than zero/i);
    }
  });

  it('record_payment rejects an unknown method', async () => {
    const { error } = await manager.rpc('record_payment', {
      p_party_id: MISSING_PARTY,
      p_date: '2026-01-01',
      p_amount: 100,
      p_method: 'crypto',
      p_note: null,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unknown payment method/i);
  });

  it('record_payment validates before it reaches the party check', async () => {
    // Same ordering rule as create_transaction: nothing is written, and no row
    // is created, for a request that was never going to succeed.
    const { error } = await manager.rpc('record_payment', {
      p_party_id: MISSING_PARTY,
      p_date: '2026-01-01',
      p_amount: 100,
      p_method: 'cash',
      p_note: null,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/party no longer exists/i);
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
