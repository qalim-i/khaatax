import { useCallback, useEffect, useState } from 'react';

import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Party, Payment, Transaction } from '@/types/db';

export interface TransactionWithRunningBalance extends Transaction {
  runningBalance: number;
}

export function usePartyDetail(partyId: string) {
  const [party, setParty] = useState<Party | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithRunningBalance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [partyRes, txRes, payRes] = await Promise.all([
        supabase.from('parties').select('*').eq('id', partyId).single(),
        supabase.from('transactions').select('*').eq('party_id', partyId).order('date', { ascending: true }).order('created_at', { ascending: true }),
        // Newest first: the payments list is a receipt history, read from the top.
        supabase.from('payments').select('*').eq('party_id', partyId).order('date', { ascending: false }).order('created_at', { ascending: false }),
      ]);
      if (partyRes.error) throw partyRes.error;
      if (txRes.error) throw txRes.error;
      if (payRes.error) throw payRes.error;

      let running = 0;
      const withBalance: TransactionWithRunningBalance[] = (txRes.data as Transaction[]).map((tx) => {
        running += tx.filled_sent - tx.empty_received;
        return { ...tx, runningBalance: running };
      });

      setParty(partyRes.data as Party);
      setTransactions(withBalance.reverse());
      setPayments((payRes.data as Payment[]) ?? []);
      setError(null);
    } catch (err) {
      logError('usePartyDetail', err);
      setError(toUserMessage(err, 'Could not load this party.'));
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { party, transactions, payments, loading, error, refresh: load };
}
