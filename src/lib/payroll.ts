// Payroll aggregation for the Payroll Summary (PRD PAY-2).
//
// Only *active* employees count toward cost: PAY-2's acceptance criteria is the
// sum of active employees' monthly pay, and removing someone from payroll is a
// soft delete (`active = false`) so their history survives. Inactive staff are
// counted separately rather than dropped, so the screen can show that the list
// is filtered without a second pass over the data.
//
// Pure so it is unit-testable without a database (TRD Section 9).

import type { Employee } from '@/types/db';

export interface RoleBreakdown {
  role: string;
  count: number;
  total: number;
}

export interface PayrollSummary {
  activeCount: number;
  inactiveCount: number;
  monthlyTotal: number;
  annualTotal: number;
  /** Mean monthly pay across active employees; 0 when there are none. */
  averagePay: number;
  byRole: RoleBreakdown[];
}

/** Shown when an employee has no role recorded — `employees.role` is nullable. */
export const UNASSIGNED_ROLE = 'Unassigned';

export function summarisePayroll(employees: readonly Employee[]): PayrollSummary {
  const active = employees.filter((employee) => employee.active);

  const monthlyTotal = active.reduce((sum, employee) => sum + employee.monthly_pay, 0);

  const roleTotals = new Map<string, RoleBreakdown>();
  for (const employee of active) {
    const role = employee.role?.trim() ? employee.role.trim() : UNASSIGNED_ROLE;
    const entry = roleTotals.get(role) ?? { role, count: 0, total: 0 };
    entry.count += 1;
    entry.total += employee.monthly_pay;
    roleTotals.set(role, entry);
  }

  return {
    activeCount: active.length,
    inactiveCount: employees.length - active.length,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    averagePay: active.length > 0 ? monthlyTotal / active.length : 0,
    byRole: [...roleTotals.values()].sort((a, b) => b.total - a.total || a.role.localeCompare(b.role)),
  };
}
