import {
  dueLabel,
  dueMagnitude,
  dueState,
  summariseReceivables,
} from '@/lib/receivables';
import type { Party } from '@/types/db';

function party(amountDue: number, overrides: Partial<Party> = {}): Party {
  return {
    id: `p-${amountDue}`,
    name: 'Sharma Gases',
    contact: null,
    security_deposit: 0,
    balance: 0,
    amount_due: amountDue,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('dueState', () => {
  it('reads a positive balance as money owed to the business', () => {
    expect(dueState(12500)).toBe('due');
  });

  it('reads a negative balance as the party being in credit', () => {
    // An advance, or an overpayment on a rounded bill. Both are ordinary, and
    // both mean the business owes the party — not the other way round.
    expect(dueState(-2500)).toBe('credit');
  });

  it('reads zero as settled', () => {
    expect(dueState(0)).toBe('settled');
  });

  it('treats sub-paisa residue as settled in both directions', () => {
    // Repeated part-payments against a rounded charge leave dust behind. Chasing
    // a party for a third of a paisa makes the whole column untrustworthy.
    expect(dueState(0.004)).toBe('settled');
    expect(dueState(-0.004)).toBe('settled');
    // A real paisa is still real.
    expect(dueState(0.01)).toBe('due');
    expect(dueState(-0.01)).toBe('credit');
  });
});

describe('dueMagnitude', () => {
  it('strips the sign so the label carries the direction', () => {
    expect(dueMagnitude(12500)).toBe(12500);
    expect(dueMagnitude(-2500)).toBe(2500);
  });
});

describe('dueLabel', () => {
  it('names each state the way it would be said out loud', () => {
    expect(dueLabel(12500)).toBe('Owes');
    expect(dueLabel(-2500)).toBe('In credit');
    expect(dueLabel(0)).toBe('Settled');
  });
});

describe('summariseReceivables', () => {
  it('counts only parties that actually owe something', () => {
    const totals = summariseReceivables([party(12500), party(0), party(-2500), party(500)]);

    expect(totals.totalDue).toBe(13000);
    expect(totals.partiesDue).toBe(2);
  });

  it('reports credit as a positive figure of its own', () => {
    const totals = summariseReceivables([party(-2500), party(-500)]);

    expect(totals.totalCredit).toBe(3000);
    expect(totals.totalDue).toBe(0);
    expect(totals.partiesDue).toBe(0);
  });

  it('does not net credits against debts', () => {
    // The failure this guards: ₹50,000 owed across six parties and ₹50,000
    // sitting as one advance nets to zero, which reads as "nothing to collect"
    // when there is very much something to collect.
    const totals = summariseReceivables([party(50000), party(-50000)]);

    expect(totals.totalDue).toBe(50000);
    expect(totals.totalCredit).toBe(50000);
    expect(totals.partiesDue).toBe(1);
  });

  it('handles an empty book', () => {
    expect(summariseReceivables([])).toEqual({
      totalDue: 0,
      totalCredit: 0,
      partiesDue: 0,
    });
  });
});
