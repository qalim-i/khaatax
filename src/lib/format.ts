/** Money formatting, defined once so mobile and the later web client agree. */

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Money on a document, always to the paisa: "₹1,250.50", "₹12,500.00".
 *
 * `formatCurrency` rounds to whole rupees, which is right for dashboards and
 * summary tiles but wrong on an Invoice or Delivery Challan — a charge of
 * ₹1,250.50 printed as "₹1,251" is a figure the party is being handed that does
 * not match what was recorded.
 */
export function formatCurrencyExact(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Compact form for chart axes, where full figures don't fit.
 *
 * The thresholds are compared on the magnitude, so a negative figure abbreviates
 * the same way its positive twin does. Comparing the signed value meant every
 * negative fell through to the last branch — -250000 rendered as "₹-250000",
 * the exact overflow the compact form exists to prevent. Nothing plots a
 * negative today, but `amount_due` is signed by design (a credit balance), so
 * the first chart that touches it would have hit this.
 */
export function formatCurrencyCompact(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const value = Math.abs(amount);

  if (value >= 10_000_000) return `₹${sign}${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `₹${sign}${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${sign}${(value / 1_000).toFixed(1)}K`;
  return `₹${sign}${Math.round(value)}`;
}

/** "11 Aug 2026" — used on expense rows and report lines. */
export function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
