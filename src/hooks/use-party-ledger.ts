import { useCallback, useEffect, useMemo, useState } from 'react';

import { startOfMonthIso } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { Party } from '@/types/db';

export interface PartyLedgerRow {
  party: Party;
  filledSentMtd: number;
  emptyReceivedMtd: number;
}

export function usePartyLedger() {
  const [rows, setRows] = useState<PartyLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [partiesRes, txRes] = await Promise.all([
        supabase.from('parties').select('*').order('name'),
        supabase.from('transactions').select('party_id, filled_sent, empty_received').gte('date', startOfMonthIso()),
      ]);
      if (partiesRes.error) throw partiesRes.error;
      if (txRes.error) throw txRes.error;

      const mtdByParty = new Map<string, { filled: number; empty: number }>();
      for (const tx of txRes.data as { party_id: string; filled_sent: number; empty_received: number }[]) {
        const entry = mtdByParty.get(tx.party_id) ?? { filled: 0, empty: 0 };
        entry.filled += tx.filled_sent;
        entry.empty += tx.empty_received;
        mtdByParty.set(tx.party_id, entry);
      }

      const combined: PartyLedgerRow[] = (partiesRes.data as Party[]).map((party) => ({
        party,
        filledSentMtd: mtdByParty.get(party.id)?.filled ?? 0,
        emptyReceivedMtd: mtdByParty.get(party.id)?.empty ?? 0,
      }));

      setRows(combined);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => r.party.name.toLowerCase().includes(q));
  }, [rows, query]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          filledSentMtd: acc.filledSentMtd + r.filledSentMtd,
          emptyReceivedMtd: acc.emptyReceivedMtd + r.emptyReceivedMtd,
          netBalance: acc.netBalance + r.party.balance,
        }),
        { filledSentMtd: 0, emptyReceivedMtd: 0, netBalance: 0 }
      ),
    [rows]
  );

  return { rows: filteredRows, totals, loading, error, query, setQuery, refresh: load };
}
