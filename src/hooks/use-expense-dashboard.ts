import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  formatMonthKey,
  monthKey,
  startOfMonthIso,
  startOfMonthsAgoIso,
  startOfYearIso,
  toIsoDate,
} from '@/lib/date';
import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

const TREND_MONTHS = 12;

export type ExpensePeriod = 'today' | 'mtd' | 'ytd';

export interface CategorySlice {
  category: string;
  amount: number;
  /** 0-1 share of the period total, for bar widths. */
  share: number;
}

export interface TrendPoint {
  key: string;
  label: string;
  amount: number;
}

interface ExpenseRecord {
  date: string;
  amount: number;
  category: string;
}

/**
 * Backs the Expense Dashboard (PRD EXP-2/3/4).
 *
 * One query covers everything: the widest window any tile needs is the earlier of
 * "start of this year" and "11 months back", and every total, the category
 * breakdown and the 12-month trend are derived from that single set in memory.
 * At this business's volume (low thousands of rows a year, TRD Section 7) that is
 * far cheaper than four round trips, and it keeps the period toggle instant.
 */
export function useExpenseDashboard() {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<ExpensePeriod>('mtd');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const windowStart =
        startOfYearIso(now) < startOfMonthsAgoIso(TREND_MONTHS - 1, now)
          ? startOfYearIso(now)
          : startOfMonthsAgoIso(TREND_MONTHS - 1, now);

      const { data, error: queryError } = await supabase
        .from('expenses')
        .select('date, amount, category')
        .gte('date', windowStart);

      if (queryError) throw queryError;
      setRecords((data as ExpenseRecord[]) ?? []);
    } catch (err) {
      logError('useExpenseDashboard', err);
      setError(toUserMessage(err, 'Could not load the expense dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = useMemo(() => new Date(), []);

  const totals = useMemo(() => {
    const today = toIsoDate(now);
    const monthStart = startOfMonthIso(now);
    const yearStart = startOfYearIso(now);

    return records.reduce(
      (acc, expense) => {
        if (expense.date === today) acc.today += expense.amount;
        if (expense.date >= monthStart) acc.mtd += expense.amount;
        if (expense.date >= yearStart) acc.ytd += expense.amount;
        return acc;
      },
      { today: 0, mtd: 0, ytd: 0 }
    );
  }, [records, now]);

  const periodStart = useMemo(() => {
    if (period === 'today') return toIsoDate(now);
    if (period === 'mtd') return startOfMonthIso(now);
    return startOfYearIso(now);
  }, [period, now]);

  const byCategory = useMemo<CategorySlice[]>(() => {
    const sums = new Map<string, number>();
    for (const expense of records) {
      if (expense.date < periodStart) continue;
      sums.set(expense.category, (sums.get(expense.category) ?? 0) + expense.amount);
    }

    const total = [...sums.values()].reduce((sum, amount) => sum + amount, 0);
    return [...sums.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        share: total > 0 ? amount / total : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [records, periodStart]);

  const trend = useMemo<TrendPoint[]>(() => {
    // Seed every bucket so months with no spend render as gaps, not missing bars.
    const buckets = new Map<string, number>();
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      buckets.set(monthKey(startOfMonthsAgoIso(i, now)), 0);
    }
    for (const expense of records) {
      const key = monthKey(expense.date);
      if (buckets.has(key)) buckets.set(key, buckets.get(key)! + expense.amount);
    }
    return [...buckets.entries()].map(([key, amount]) => ({
      key,
      label: formatMonthKey(key),
      amount,
    }));
  }, [records, now]);

  return {
    totals,
    byCategory,
    trend,
    period,
    setPeriod,
    periodStart,
    loading,
    error,
    refresh: load,
  };
}
