import { useMemo, useState } from 'react';

import { orEmpty, useAsyncData } from '@/hooks/use-async-data';
import { supabase } from '@/lib/supabase';
import type { ExpenseCategory } from '@/types/db';

export interface ExpenseFilters {
  category: string | null;
  from: string | null;
  to: string | null;
  createdBy: string | null;
}

export const EMPTY_EXPENSE_FILTERS: ExpenseFilters = {
  category: null,
  from: null,
  to: null,
  createdBy: null,
};

/**
 * Backs the Expense List (PRD EXP-5). Filtering happens server-side so the list
 * stays cheap as history accumulates — unlike the dashboard, this can reach back
 * across every year on record.
 *
 * Server-side filtering is also why the sequence guard in `useAsyncData` matters
 * here: every filter tap starts a new query, and two in flight can land out of
 * order.
 */
export function useExpenses(initialFilters: Partial<ExpenseFilters> = {}) {
  const [filters, setFilters] = useState<ExpenseFilters>({
    ...EMPTY_EXPENSE_FILTERS,
    ...initialFilters,
  });

  const { category, from, to, createdBy } = filters;

  const { data, loading, initialLoading, error, refresh } = useAsyncData(
    async () => {
      let query = supabase.from('expenses').select('*').order('date', { ascending: false });

      if (category) query = query.eq('category', category);
      if (from) query = query.gte('date', from);
      if (to) query = query.lte('date', to);
      if (createdBy) query = query.eq('created_by', createdBy);

      const { data, error } = await query;
      if (error) throw error;
      return data.map((row) => ({ ...row, category: row.category as ExpenseCategory }));
    },
    {
      fallbackMessage: 'Could not load expenses.',
      context: 'useExpenses',
      deps: [category, from, to, createdBy],
    }
  );

  const expenses = orEmpty(data);

  function setFilter<K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_EXPENSE_FILTERS);
  }

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const activeFilterCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);

  return {
    expenses,
    total,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    loading,
    initialLoading,
    error,
    refresh,
  };
}
