/** Money formatting, defined once so mobile and the later web client agree. */

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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
