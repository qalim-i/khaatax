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

/** Compact form for chart axes, where full figures don't fit. */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
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
