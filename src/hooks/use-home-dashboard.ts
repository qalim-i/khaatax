import { useAsyncData } from '@/hooks/use-async-data';
import { startOfMonthIso } from '@/lib/date';
import { supabase } from '@/lib/supabase';

export interface HomeDashboardData {
  filled: number;
  empty: number;
  outstanding: number;
  expenseMtd: number;
  payrollMonthlyTotal: number;
}

export function useHomeDashboard(includePayroll: boolean) {
  const { data, loading, error, refresh } = useAsyncData<HomeDashboardData>(
    async () => {
      const [stockRes, expenseRes, payrollRes] = await Promise.all([
        supabase.from('stock').select('status, quantity'),
        supabase.from('expenses').select('amount').gte('date', startOfMonthIso()),
        includePayroll
          ? supabase.from('employees').select('monthly_pay').eq('active', true)
          : Promise.resolve({ data: [] as { monthly_pay: number }[], error: null }),
      ]);

      if (stockRes.error) throw stockRes.error;
      if (expenseRes.error) throw expenseRes.error;
      if (payrollRes.error) throw payrollRes.error;

      const stockByStatus = new Map(stockRes.data.map((s) => [s.status, s.quantity]));
      const expenseMtd = expenseRes.data.reduce((sum, e) => sum + e.amount, 0);
      const payrollMonthlyTotal = payrollRes.data.reduce((sum, e) => sum + e.monthly_pay, 0);

      return {
        filled: stockByStatus.get('filled') ?? 0,
        empty: stockByStatus.get('empty') ?? 0,
        outstanding: stockByStatus.get('at_customer') ?? 0,
        expenseMtd,
        payrollMonthlyTotal,
      };
    },
    {
      fallbackMessage: 'Could not load the dashboard.',
      context: 'useHomeDashboard',
      deps: [includePayroll],
    }
  );

  return { data, loading, error, refresh };
}
