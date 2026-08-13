import { useMemo, useState } from 'react';

import { useAsyncData } from '@/hooks/use-async-data';
import { computeOutstanding, type OutstandingTransactionInput } from '@/lib/outstanding';
import { supabase } from '@/lib/supabase';
import type { Party } from '@/types/db';

export interface OutstandingFilters {
  partyId: string | null;
  cylinderType: string | null;
  /** Transaction date window fed into the aging calculation. */
  from: string | null;
  to: string | null;
  /** Show only rows held at least this many days. */
  minOverdueDays: number | null;
}

export const EMPTY_OUTSTANDING_FILTERS: OutstandingFilters = {
  partyId: null,
  cylinderType: null,
  from: null,
  to: null,
  minOverdueDays: null,
};

export interface OutstandingReportRow {
  partyId: string;
  partyName: string;
  cylinderType: string;
  quantity: number;
  oldestDate: string;
  overdueDays: number;
}

/**
 * Backs the Outstanding Report (PRD INV-4).
 *
 * The date-range filter is applied *before* the aging calculation, not after:
 * it narrows which transactions are considered, so the report answers "what went
 * out in this window and hasn't come back" rather than silently hiding returns
 * and overstating what's held. The remaining filters are presentational and run
 * on the computed rows.
 */
export function useOutstanding() {
  const [filters, setFilters] = useState<OutstandingFilters>(EMPTY_OUTSTANDING_FILTERS);

  const { from, to } = filters;

  const { data, loading, initialLoading, error, refresh } = useAsyncData<{
    parties: Party[];
    transactions: OutstandingTransactionInput[];
  }>(
    async () => {
      let txQuery = supabase
        .from('transactions')
        .select('party_id, date, cylinder_type, filled_sent, empty_received')
        .order('date');

      if (from) txQuery = txQuery.gte('date', from);
      if (to) txQuery = txQuery.lte('date', to);

      const [partiesRes, txRes] = await Promise.all([
        supabase.from('parties').select('*').order('name'),
        txQuery,
      ]);

      if (partiesRes.error) throw partiesRes.error;
      if (txRes.error) throw txRes.error;

      return { parties: partiesRes.data, transactions: txRes.data };
    },
    {
      fallbackMessage: 'Could not load the outstanding report.',
      context: 'useOutstanding',
      deps: [from, to],
    }
  );

  // Memoised, not inlined: `data?.parties ?? []` builds a fresh array on every
  // render while the first load is still in flight, which would invalidate every
  // useMemo below it and recompute the whole report each pass.
  const parties = useMemo(() => data?.parties ?? [], [data]);
  const transactions = useMemo(() => data?.transactions ?? [], [data]);

  const allRows = useMemo<OutstandingReportRow[]>(() => {
    const partyNames = new Map(parties.map((party) => [party.id, party.name]));
    return computeOutstanding(transactions)
      .map((row) => ({
        ...row,
        partyName: partyNames.get(row.partyId) ?? 'Unknown party',
      }))
      // Longest-held first — that's the follow-up queue.
      .sort((a, b) => b.overdueDays - a.overdueDays || b.quantity - a.quantity);
  }, [parties, transactions]);

  const cylinderTypes = useMemo(
    () => [...new Set(allRows.map((row) => row.cylinderType))].sort(),
    [allRows]
  );

  const rows = useMemo(
    () =>
      allRows.filter((row) => {
        if (filters.partyId && row.partyId !== filters.partyId) return false;
        if (filters.cylinderType && row.cylinderType !== filters.cylinderType) return false;
        if (filters.minOverdueDays !== null && row.overdueDays < filters.minOverdueDays) return false;
        return true;
      }),
    [allRows, filters.partyId, filters.cylinderType, filters.minOverdueDays]
  );

  const totals = useMemo(
    () => ({
      cylinders: rows.reduce((sum, row) => sum + row.quantity, 0),
      parties: new Set(rows.map((row) => row.partyId)).size,
      maxOverdueDays: rows.reduce((max, row) => Math.max(max, row.overdueDays), 0),
    }),
    [rows]
  );

  function setFilter<K extends keyof OutstandingFilters>(key: K, value: OutstandingFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_OUTSTANDING_FILTERS);
  }

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== null).length,
    [filters]
  );

  return {
    rows,
    totals,
    parties,
    cylinderTypes,
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
