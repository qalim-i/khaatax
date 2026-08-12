import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export interface ActivityItem {
  id: string;
  kind: 'dispatch' | 'return' | 'expense';
  title: string;
  subtitle: string;
  timestamp: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function useRecentActivity(limit = 5) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [txRes, expRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, filled_sent, empty_received, created_at, parties(name)')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('expenses')
        .select('id, amount, category, note, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    // A denied read comes back as an error with no rows. Without this the feed
    // renders empty and indistinguishable from "nothing has happened yet".
    const failure = txRes.error ?? expRes.error;
    setError(failure ? failure.message : null);

    const txItems: ActivityItem[] = (txRes.data ?? []).map((t: any) => ({
      id: `tx-${t.id}`,
      kind: t.filled_sent > 0 ? 'dispatch' : 'return',
      title: t.filled_sent > 0 ? 'Cylinders Dispatched' : 'Empties Received',
      subtitle:
        t.filled_sent > 0
          ? `To: ${t.parties?.name ?? 'Unknown party'}`
          : `${t.empty_received} units from ${t.parties?.name ?? 'Unknown party'}`,
      timestamp: t.created_at,
    }));

    const expItems: ActivityItem[] = (expRes.data ?? []).map((e: any) => ({
      id: `exp-${e.id}`,
      kind: 'expense',
      title: 'Expense Logged',
      subtitle: `${e.category}${e.note ? ` - ${e.note}` : ''}`,
      timestamp: e.created_at,
    }));

    const merged = [...txItems, ...expItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    setItems(merged);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, timeAgo, refresh: load };
}
