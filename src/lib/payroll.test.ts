import { summarisePayroll, UNASSIGNED_ROLE } from '@/lib/payroll';
import type { Employee } from '@/types/db';

function employee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Staff Member',
    role: 'Driver',
    monthly_pay: 10_000,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('summarisePayroll', () => {
  it('sums only active employees (PAY-2)', () => {
    const summary = summarisePayroll([
      employee({ monthly_pay: 20_000 }),
      employee({ monthly_pay: 15_000 }),
      employee({ monthly_pay: 99_000, active: false }),
    ]);

    expect(summary.monthlyTotal).toBe(35_000);
    expect(summary.activeCount).toBe(2);
    expect(summary.inactiveCount).toBe(1);
  });

  it('does not let a removed employee leak into the annual figure', () => {
    const summary = summarisePayroll([
      employee({ monthly_pay: 10_000 }),
      employee({ monthly_pay: 50_000, active: false }),
    ]);

    expect(summary.annualTotal).toBe(120_000);
  });

  it('averages across active employees only', () => {
    const summary = summarisePayroll([
      employee({ monthly_pay: 10_000 }),
      employee({ monthly_pay: 20_000 }),
      employee({ monthly_pay: 1_000_000, active: false }),
    ]);

    expect(summary.averagePay).toBe(15_000);
  });

  it('returns zeroes rather than NaN for an empty payroll', () => {
    const summary = summarisePayroll([]);

    expect(summary.monthlyTotal).toBe(0);
    expect(summary.annualTotal).toBe(0);
    expect(summary.averagePay).toBe(0);
    expect(summary.byRole).toEqual([]);
  });

  it('returns zeroes when every employee has been removed', () => {
    const summary = summarisePayroll([
      employee({ monthly_pay: 20_000, active: false }),
      employee({ monthly_pay: 30_000, active: false }),
    ]);

    expect(summary.averagePay).toBe(0);
    expect(summary.monthlyTotal).toBe(0);
    expect(summary.inactiveCount).toBe(2);
  });

  it('groups by role, largest cost first', () => {
    const summary = summarisePayroll([
      employee({ role: 'Driver', monthly_pay: 12_000 }),
      employee({ role: 'Driver', monthly_pay: 13_000 }),
      employee({ role: 'Loader', monthly_pay: 30_000 }),
    ]);

    expect(summary.byRole).toEqual([
      { role: 'Loader', count: 1, total: 30_000 },
      { role: 'Driver', count: 2, total: 25_000 },
    ]);
  });

  it('buckets missing and blank roles under a single label', () => {
    const summary = summarisePayroll([
      employee({ role: null, monthly_pay: 5_000 }),
      employee({ role: '   ', monthly_pay: 6_000 }),
    ]);

    expect(summary.byRole).toEqual([{ role: UNASSIGNED_ROLE, count: 2, total: 11_000 }]);
  });

  it('trims role names so " Driver" and "Driver" are one group', () => {
    const summary = summarisePayroll([
      employee({ role: ' Driver ', monthly_pay: 10_000 }),
      employee({ role: 'Driver', monthly_pay: 10_000 }),
    ]);

    expect(summary.byRole).toEqual([{ role: 'Driver', count: 2, total: 20_000 }]);
  });
});
