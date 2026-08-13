import {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyExact,
  formatDisplayDate,
} from '@/lib/format';

describe('formatCurrency', () => {
  it('rounds to whole rupees for dashboards', () => {
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency(12500)).toBe('₹12,500');
  });

  it('groups in the Indian system, not thousands', () => {
    // 1,25,000 rather than 125,000 — the whole reason the locale is pinned.
    expect(formatCurrency(125000)).toBe('₹1,25,000');
    expect(formatCurrency(1250000)).toBe('₹12,50,000');
  });
});

describe('formatCurrencyExact', () => {
  it('always carries two decimals', () => {
    expect(formatCurrencyExact(12500)).toBe('₹12,500.00');
    expect(formatCurrencyExact(0)).toBe('₹0.00');
  });

  it('does not round paise away', () => {
    // The distinction that matters on a printed Invoice: formatCurrency would
    // hand the party "₹1,251" for a charge that was recorded as ₹1,250.50.
    expect(formatCurrencyExact(1250.5)).toBe('₹1,250.50');
    expect(formatCurrency(1250.5)).toBe('₹1,251');
  });
});

describe('formatCurrencyCompact', () => {
  it('abbreviates at the Indian scale boundaries', () => {
    expect(formatCurrencyCompact(999)).toBe('₹999');
    expect(formatCurrencyCompact(1_000)).toBe('₹1.0K');
    expect(formatCurrencyCompact(250_000)).toBe('₹2.5L');
    expect(formatCurrencyCompact(15_000_000)).toBe('₹1.5Cr');
  });

  it('abbreviates negatives the same way as their positive twin', () => {
    // Previously every negative fell through to the last branch, so this
    // rendered as "₹-250000" and overflowed the axis it was meant to fit.
    expect(formatCurrencyCompact(-250_000)).toBe('₹-2.5L');
    expect(formatCurrencyCompact(-1_000)).toBe('₹-1.0K');
    expect(formatCurrencyCompact(-15_000_000)).toBe('₹-1.5Cr');
  });

  it('leaves sub-thousand values, including negatives, unabbreviated', () => {
    expect(formatCurrencyCompact(0)).toBe('₹0');
    expect(formatCurrencyCompact(-999)).toBe('₹-999');
  });
});

describe('formatDisplayDate', () => {
  it('reads an ISO calendar day as a local day', () => {
    expect(formatDisplayDate('2026-08-13')).toBe('13 Aug 2026');
  });

  it('does not shift across a month boundary', () => {
    // Parsing via `new Date('2026-08-01')` gives UTC midnight, which renders as
    // 31 Jul in any timezone behind UTC. These are built from calendar parts.
    expect(formatDisplayDate('2026-08-01')).toBe('1 Aug 2026');
    expect(formatDisplayDate('2026-01-01')).toBe('1 Jan 2026');
  });
});
