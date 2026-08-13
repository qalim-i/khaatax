import { useAsyncData } from '@/hooks/use-async-data';
import { supabase } from '@/lib/supabase';
import type { Party, Payment, PaymentMethod, Transaction } from '@/types/db';

export interface TransactionWithRunningBalance extends Transaction {
  runningBalance: number;
}

export function usePartyDetail(partyId: string) {
  const { data, loading, error, refresh } = useAsyncData<{
    party: Party;
    transactions: TransactionWithRunningBalance[];
    payments: Payment[];
  }>(
    async () => {
      const [partyRes, txRes, payRes] = await Promise.all([
        supabase.from('parties').select('*').eq('id', partyId).single(),
        supabase
          .from('transactions')
          .select('*')
          .eq('party_id', partyId)
          .order('date', { ascending: true })
          .order('created_at', { ascending: true }),
        // Newest first: the payments list is a receipt history, read from the top.
        supabase
          .from('payments')
          .select('*')
          .eq('party_id', partyId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);
      if (partyRes.error) throw partyRes.error;
      if (txRes.error) throw txRes.error;
      if (payRes.error) throw payRes.error;

      let running = 0;
      const withBalance: TransactionWithRunningBalance[] = txRes.data.map((tx) => {
        running += tx.filled_sent - tx.empty_received;
        return { ...tx, runningBalance: running };
      });

      return {
        party: partyRes.data,
        // Computed oldest-first so the running balance accumulates correctly,
        // then reversed for display.
        transactions: withBalance.reverse(),
        payments: payRes.data.map((row) => ({ ...row, method: row.method as PaymentMethod })),
      };
    },
    {
      fallbackMessage: 'Could not load this party.',
      context: 'usePartyDetail',
      deps: [partyId],
    }
  );

  return {
    party: data?.party ?? null,
    transactions: data?.transactions ?? [],
    payments: data?.payments ?? [],
    loading,
    error,
    refresh,
  };
}
