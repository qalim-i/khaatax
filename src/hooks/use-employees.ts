import { useCallback, useEffect, useMemo, useState } from 'react';

import { summarisePayroll } from '@/lib/payroll';
import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Employee, EmployeeInput } from '@/types/db';

/**
 * Payroll CRUD (PRD PAY-1/PAY-2). Owner-only — every call here goes through the
 * `owner_full_access` policy on `employees`, so a manager session gets zero rows
 * back rather than an error. The UI must not be the only thing keeping managers
 * out (CLAUDE.md Non-Negotiable Rule 1); this hook relies on that policy rather
 * than re-checking the role client-side.
 *
 * "Remove" is a soft delete: `active` flips to false so the person drops out of
 * cost totals while their record survives. Nothing here hard-deletes a row.
 */
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase.from('employees').select('*').order('name');
    if (fetchError) {
      logError('useEmployees.load', fetchError);
      setError(toUserMessage(fetchError, 'Could not load the payroll list.'));
    } else {
      setError(null);
      setEmployees((data as Employee[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (input: EmployeeInput) => {
      const { error: insertError } = await supabase.from('employees').insert(input);
      if (insertError) {
        logError('useEmployees.create', insertError);
        setError(toUserMessage(insertError, 'Could not add the employee.'));
        return false;
      }
      await load();
      return true;
    },
    [load]
  );

  const update = useCallback(
    async (id: string, input: EmployeeInput) => {
      const { error: updateError } = await supabase.from('employees').update(input).eq('id', id);
      if (updateError) {
        logError('useEmployees.update', updateError);
        setError(toUserMessage(updateError, 'Could not save the employee.'));
        return false;
      }
      await load();
      return true;
    },
    [load]
  );

  /** Soft delete / restore — see the note above on why this is not a DELETE. */
  const setActive = useCallback(
    async (id: string, active: boolean) => {
      const { error: updateError } = await supabase.from('employees').update({ active }).eq('id', id);
      if (updateError) {
        logError('useEmployees.setActive', updateError);
        setError(toUserMessage(updateError, 'Could not update the employee.'));
        return false;
      }
      await load();
      return true;
    },
    [load]
  );

  const summary = useMemo(() => summarisePayroll(employees), [employees]);

  const visibleEmployees = useMemo(
    () =>
      employees.filter((employee) => (showInactive ? true : employee.active)),
    [employees, showInactive]
  );

  return {
    employees: visibleEmployees,
    summary,
    loading,
    error,
    showInactive,
    setShowInactive,
    refresh: load,
    create,
    update,
    setActive,
  };
}
