/**
 * Parsing for the rupee amount field on New Transaction.
 *
 * Sibling of `parseQuantity`, and deliberately not the same function: a cylinder
 * count is a whole number, a charge is money and takes paise. Reusing the
 * quantity parser would have rejected "1250.50"; reusing `Number()` would have
 * accepted "-500", "1e9", "Infinity" and " " — and this figure is printed on a
 * document handed to the party, so a silently-wrong value is worse than a
 * rejected one.
 *
 * Migration 0009 rejects null and negative amounts at the database. This is the
 * second line of defence, and the one that produces a message a user can act on.
 */

/** Rupees >= 0 with at most two decimal places, or null if unreadable. */
export function parseAmount(raw: string): number | null {
  // Thousands separators are natural to type on an amount field ("1,250"), and
  // are not meaningful to the value.
  const trimmed = raw.trim().replace(/,/g, '');
  if (trimmed === '') return 0;

  // Digits, optionally a decimal point and one or two more digits. No sign, no
  // exponent, no leading/trailing point.
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(trimmed)) return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;

  // Guard the numeric(12,2) column: anything past ten crore is a typo, not a
  // delivery, and would come back as a constraint violation the user cannot act on.
  if (value > 9_999_999_999) return null;

  return Math.round(value * 100) / 100;
}
