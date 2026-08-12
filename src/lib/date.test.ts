import { daysSince, monthKey, startOfMonthIso, startOfYearIso, toIsoDate } from '@/lib/date';

const NOW = new Date(2026, 7, 11); // 2026-08-11

describe('toIsoDate', () => {
  it('formats from local calendar parts, not UTC', () => {
    // The bug these helpers replaced: `new Date(2026, 7, 1).toISOString().slice(0, 10)`
    // yields 2026-07-31 in any timezone ahead of UTC (e.g. IST), which leaked a day
    // of last month into every "this month" total.
    expect(toIsoDate(new Date(2026, 7, 1))).toBe('2026-08-01');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('period boundaries', () => {
  it('startOfMonthIso returns the first of the current month', () => {
    expect(startOfMonthIso(NOW)).toBe('2026-08-01');
  });

  it('startOfYearIso returns 1 January', () => {
    expect(startOfYearIso(NOW)).toBe('2026-01-01');
  });
});

describe('daysSince', () => {
  it('counts whole days', () => {
    expect(daysSince('2026-08-01', NOW)).toBe(10);
  });

  it('is zero for today', () => {
    expect(daysSince('2026-08-11', NOW)).toBe(0);
  });

  it('never goes negative for a future date', () => {
    expect(daysSince('2026-09-01', NOW)).toBe(0);
  });

  it('spans month and year boundaries', () => {
    expect(daysSince('2025-08-11', NOW)).toBe(365);
  });
});

describe('monthKey', () => {
  it('buckets an ISO date by year-month', () => {
    expect(monthKey('2026-08-11')).toBe('2026-08');
  });
});
