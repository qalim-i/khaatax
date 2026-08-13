import { useMemo, useState } from 'react';

import { orEmpty, useAsyncData } from '@/hooks/use-async-data';
import { startOfMonthIso } from '@/lib/date';
import { summariseReceivables } from '@/lib/receivables';
import { supabase } from '@/lib/supabase';
import type { Party } from '@/types/db';

export interface PartyLedgerRow {
  party: Party;
  filledSentMtd: number;
  emptyReceivedMtd: number;
}

export function usePartyLedger() {
  const [query, setQuery] = useState('');

  const { data, loading, initialLoading, error, refresh } = useAsyncData<PartyLedgerRow[]>(
    async () => {
      const [partiesRes, txRes] = await Promise.all([
        supabase.from('parties').select('*').order('name'),
        supabase
          .from('transactions')
          .select('party_id, filled_sent, empty_received')
          .gte('date', startOfMonthIso()),
      ]);
      if (partiesRes.error) throw partiesRes.error;
      if (txRes.error) throw txRes.error;

      const mtdByParty = new Map<string, { filled: number; empty: number }>();
      for (const tx of txRes.data) {
        const entry = mtdByParty.get(tx.party_id) ?? { filled: 0, empty: 0 };
        entry.filled += tx.filled_sent;
        entry.empty += tx.empty_received;
        mtdByParty.set(tx.party_id, entry);
      }

      return partiesRes.data.map((party) => ({
        party,
        filledSentMtd: mtdByParty.get(party.id)?.filled ?? 0,
        emptyReceivedMtd: mtdByParty.get(party.id)?.empty ?? 0,
      }));
    },
    { fallbackMessage: 'Could not load the party ledger.', context: 'usePartyLedger' }
  );

  const rows = orEmpty(data);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => r.party.name.toLowerCase().includes(q));
  }, [rows, query]);

  /*
    Totals are over ALL rows, not the filtered view — they describe the book, and
    a "total outstanding" that moved as you typed in the search box would be a
    figure nobody could act on.
  */
  const totals = useMemo(() => {
    const counts = rows.reduce(
      (acc, r) => ({
        filledSentMtd: acc.filledSentMtd + r.filledSentMtd,
        emptyReceivedMtd: acc.emptyReceivedMtd + r.emptyReceivedMtd,
        netBalance: acc.netBalance + r.party.balance,
      }),
      { filledSentMtd: 0, emptyReceivedMtd: 0, netBalance: 0 }
    );

    return { ...counts, ...summariseReceivables(rows.map((r) => r.party)) };
  }, [rows]);

  return { rows: filteredRows, totals, loading, initialLoading, error, query, setQuery, refresh };
}
