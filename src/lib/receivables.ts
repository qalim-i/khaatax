/**
 * Reading `parties.amount_due` (migration 0010).
 *
 * Pure — no network, no React — so it is unit-tested directly and reusable by the
 * deferred owner web client, like `outstanding.ts` alongside it.
 *
 * The whole reason this module exists is that `amount_due` has THREE meanings
 * depending on sign, and a screen that renders the raw number gets two of them
 * wrong. "-2,500" shown as an amount owed is not a small formatting slip: it
 * tells the user to collect money from someone the business actually owes.
 */

import type { Party } from '@/types/db';

export type DueState = 'due' | 'settled' | 'credit';

/**
 * Sub-rupee residue is treated as settled. Repeated part-payments against a
 * rounded charge leave amounts like 0.004 behind, and chasing a party for a third
 * of a paisa is worse than useless — it makes the whole column untrustworthy.
 */
const SETTLED_EPSILON = 0.005;

export function dueState(amountDue: number): DueState {
  if (amountDue > SETTLED_EPSILON) return 'due';
  if (amountDue < -SETTLED_EPSILON) return 'credit';
  return 'settled';
}

/** Always positive — the sign is carried by the state, not the number. */
export function dueMagnitude(amountDue: number): number {
  return Math.abs(amountDue);
}

/** "Owes" / "Settled" / "In credit" — the label that belongs next to the figure. */
export function dueLabel(amountDue: number): string {
  switch (dueState(amountDue)) {
    case 'due':
      return 'Owes';
    case 'credit':
      return 'In credit';
    default:
      return 'Settled';
  }
}

export interface ReceivablesTotals {
  /** Sum of what parties in debt owe. Never negative. */
  totalDue: number;
  /** Sum of what the business owes parties in credit, as a positive figure. */
  totalCredit: number;
  /** Parties with money outstanding. */
  partiesDue: number;
}

/**
 * Debits and credits are summed SEPARATELY rather than netted.
 *
 * A net figure hides the thing the owner needs: ₹50,000 owed by six parties and
 * ₹50,000 sitting as one party's advance nets to zero, which reads as "nothing to
 * collect" when there is very much something to collect. The two numbers answer
 * different questions and are reported as two numbers.
 */
export function summariseReceivables(parties: readonly Party[]): ReceivablesTotals {
  let totalDue = 0;
  let totalCredit = 0;
  let partiesDue = 0;

  for (const party of parties) {
    switch (dueState(party.amount_due)) {
      case 'due':
        totalDue += party.amount_due;
        partiesDue += 1;
        break;
      case 'credit':
        totalCredit += -party.amount_due;
        break;
      default:
        break;
    }
  }

  return { totalDue, totalCredit, partiesDue };
}
