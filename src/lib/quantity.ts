/**
 * Parsing for the cylinder-count fields on New Transaction.
 *
 * Lives here rather than in the screen so it can be tested. The screen used
 * `parseInt(raw, 10) || 0`, which silently turned "abc" and "" into 0 — and,
 * worse, passed "-5" straight through as -5, since -5 is truthy and never hits
 * the `|| 0`. Android's number-pad does offer a minus sign, so "-5" was
 * reachable. A negative quantity then ran `create_transaction` backwards: stock
 * went *up* and the party's balance went *down*, inventing inventory and erasing
 * receivables.
 *
 * Migration 0007 rejects that at the database now. This is the second line of
 * defence, and the one that produces a message a user can act on instead of a
 * constraint violation.
 */

/** A whole count >= 0, or null if the field cannot be read as one. */
export function parseQuantity(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return 0;

  // Digits only: no sign, no decimal point, no exponent, no whitespace.
  if (!/^[0-9]+$/.test(trimmed)) return null;

  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}
