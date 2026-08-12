import { useCallback, useEffect, useState } from 'react';

import { startOfMonthIso } from '@/lib/date';
import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Stock } from '@/types/db';

export interface HomeDashboardData {
  filled: number;
  empty: number;
  outstanding: number;
  expenseMtd: number;
  payrollMonthlyTotal: number;
}

export function useHomeDashboard(includePayroll: boolean) {
  const [data, setData] = useState<HomeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockRes, expenseRes, payrollRes] = await Promise.all([
        supabase.from('stock').select('status, quantity'),
        supabase.from('expenses').select('amount').gte('date', startOfMonthIso()),
        includePayroll
          ? supabase.from('employees').select('monthly_pay').eq('active', true)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (stockRes.error) throw stockRes.error;
      if (expenseRes.error) throw expenseRes.error;
      if (payrollRes.error) throw payrollRes.error;

      const stockByStatus = new Map((stockRes.data as Pick<Stock, 'status' | 'quantity'>[]).map((s) => [s.status, s.quantity]));
      const expenseMtd = (expenseRes.data as { amount: number }[]).reduce((sum, e) => sum + e.amount, 0);
      const payrollMonthlyTotal = (payrollRes.data as { monthly_pay: number }[]).reduce(
        (sum, e) => sum + e.monthly_pay,
        0
      );

      setData({
        filled: stockByStatus.get('filled') ?? 0,
        empty: stockByStatus.get('empty') ?? 0,
        outstanding: stockByStatus.get('at_customer') ?? 0,
        expenseMtd,
        payrollMonthlyTotal,
      });
    } catch (err) {
      logError('useHomeDashboard', err);
      setError(toUserMessage(err, 'Could not load the dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [includePayroll]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
