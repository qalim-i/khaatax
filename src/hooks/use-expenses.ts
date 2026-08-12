import { useCallback, useEffect, useMemo, useState } from 'react';

import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Expense } from '@/types/db';

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
 */
export function useExpenses(initialFilters: Partial<ExpenseFilters> = {}) {
  const [filters, setFilters] = useState<ExpenseFilters>({
    ...EMPTY_EXPENSE_FILTERS,
    ...initialFilters,
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { category, from, to, createdBy } = filters;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('expenses').select('*').order('date', { ascending: false });

      if (category) query = query.eq('category', category);
      if (from) query = query.gte('date', from);
      if (to) query = query.lte('date', to);
      if (createdBy) query = query.eq('created_by', createdBy);

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setExpenses((data as Expense[]) ?? []);
    } catch (err) {
      logError('useExpenses', err);
      setError(toUserMessage(err, 'Could not load expenses.'));
    } finally {
      setLoading(false);
    }
  }, [category, from, to, createdBy]);

  useEffect(() => {
    load();
  }, [load]);

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

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  return {
    expenses,
    total,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    loading,
    error,
    refresh: load,
  };
}
