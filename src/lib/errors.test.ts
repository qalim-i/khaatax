import { toUserMessage } from './errors';

describe('toUserMessage', () => {
  it('passes through messages our own RPCs raise deliberately', () => {
    // KX001 is stamped by create_transaction / adjust_stock (migration 0008) on
    // the messages written for the user. Those are the only thing that says what
    // actually went wrong, so they must survive.
    expect(
      toUserMessage({ code: 'KX001', message: 'Only 3 filled cylinder(s) in stock, cannot send 5' })
    ).toBe('Only 3 filled cylinder(s) in stock, cannot send 5');
  });

  it('does not pass through a bare P0001 from elsewhere in the database', () => {
    // P0001 is the default for *any* unqualified `raise exception` — a trigger,
    // an extension, a function added later. Keying on it would hand arbitrary
    // internal text to the screen, which is what this module exists to prevent.
    expect(
      toUserMessage(
        { code: 'P0001', message: 'relation "internal_audit_log" violated trigger trg_x' },
        'Could not save.'
      )
    ).toBe('Could not save.');
  });

  it('survives a thrown primitive without crashing the handler', () => {
    // `catch` binds unknown and `throw 42` is legal; reading properties off a
    // primitive used to throw inside the error path itself.
    expect(toUserMessage(42, 'Could not load.')).toBe('Could not load.');
    expect(toUserMessage(true, 'Could not load.')).toBe('Could not load.');
    expect(toUserMessage(Symbol('x'), 'Could not load.')).toBe('Could not load.');
  });

  it('does not leak schema detail from constraint violations', () => {
    const raw = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "transactions_invoice_no_key"',
      details: 'Key (invoice_no)=(201) already exists.',
    };

    const shown = toUserMessage(raw);

    expect(shown).toBe('That record already exists.');
    expect(shown).not.toMatch(/constraint|invoice_no|transactions_/);
  });

  it('does not leak policy names from an RLS denial', () => {
    const shown = toUserMessage({
      code: '42501',
      message: 'new row violates row-level security policy for table "employees"',
    });

    expect(shown).toBe("You don't have permission to do that.");
    expect(shown).not.toMatch(/employees|policy/);
  });

  it('recognises an expired session', () => {
    expect(toUserMessage({ code: 'PGRST301', message: 'JWT expired' })).toMatch(/session has expired/i);
    expect(toUserMessage({ message: 'invalid token' })).toMatch(/session has expired/i);
  });

  it('recognises a connectivity failure', () => {
    expect(toUserMessage({ message: 'Network request failed' })).toMatch(/check your connection/i);
  });

  it('falls back to the caller-supplied description for anything unrecognised', () => {
    expect(
      toUserMessage({ code: 'XX000', message: 'internal error: pg_toast_2619 corrupt' }, 'Could not load parties.')
    ).toBe('Could not load parties.');
  });

  it('handles null, undefined and plain strings', () => {
    expect(toUserMessage(null, 'Fallback.')).toBe('Fallback.');
    expect(toUserMessage(undefined, 'Fallback.')).toBe('Fallback.');
    expect(toUserMessage('Already user-facing.')).toBe('Already user-facing.');
  });
});
