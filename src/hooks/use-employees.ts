import { useCallback, useMemo, useState } from 'react';

import { orEmpty, useAsyncData } from '@/hooks/use-async-data';
import { logError, toUserMessage } from '@/lib/errors';
import { summarisePayroll } from '@/lib/payroll';
import { supabase } from '@/lib/supabase';
import type { EmployeeInput } from '@/types/db';

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
  const [showInactive, setShowInactive] = useState(false);
  // Load failures are owned by useAsyncData; write failures are not, and the two
  // are surfaced through one `error` because the screen has one place to show it.
  const [writeError, setWriteError] = useState<string | null>(null);

  const {
    data,
    loading,
    initialLoading,
    error: loadError,
    refresh,
  } = useAsyncData(
    async () => {
      const { data, error } = await supabase.from('employees').select('*').order('name');
      if (error) throw error;
      return data;
    },
    { fallbackMessage: 'Could not load the payroll list.', context: 'useEmployees' }
  );

  const employees = orEmpty(data);

  const runWrite = useCallback(
    async (context: string, fallback: string, write: () => PromiseLike<{ error: unknown }>) => {
      const { error } = await write();
      if (error) {
        logError(context, error);
        setWriteError(toUserMessage(error, fallback));
        return false;
      }
      setWriteError(null);
      await refresh();
      return true;
    },
    [refresh]
  );

  const create = useCallback(
    (input: EmployeeInput) =>
      runWrite('useEmployees.create', 'Could not add the employee.', () =>
        supabase.from('employees').insert(input)
      ),
    [runWrite]
  );

  const update = useCallback(
    (id: string, input: EmployeeInput) =>
      runWrite('useEmployees.update', 'Could not save the employee.', () =>
        supabase.from('employees').update(input).eq('id', id)
      ),
    [runWrite]
  );

  /** Soft delete / restore — see the note above on why this is not a DELETE. */
  const setActive = useCallback(
    (id: string, active: boolean) =>
      runWrite('useEmployees.setActive', 'Could not update the employee.', () =>
        supabase.from('employees').update({ active }).eq('id', id)
      ),
    [runWrite]
  );

  const summary = useMemo(() => summarisePayroll(employees), [employees]);

  const visibleEmployees = useMemo(
    () => employees.filter((employee) => (showInactive ? true : employee.active)),
    [employees, showInactive]
  );

  return {
    employees: visibleEmployees,
    summary,
    loading,
    initialLoading,
    error: loadError ?? writeError,
    showInactive,
    setShowInactive,
    refresh,
    create,
    update,
    setActive,
  };
}
