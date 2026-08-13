import { orEmpty, useAsyncData } from '@/hooks/use-async-data';
import { supabase } from '@/lib/supabase';

export interface ActivityItem {
  id: string;
  kind: 'dispatch' | 'return' | 'expense';
  title: string;
  subtitle: string;
  /**
   * `created_at` is nullable in the schema (`timestamptz default now()` with no
   * NOT NULL). Rows written through the app always carry one, but the feed is
   * ordered and labelled by this value, so the absent case is modelled rather
   * than assumed — it used to be hidden behind an `any` on the row mapper.
   */
  timestamp: string | null;
}

function timeAgo(iso: string | null): string {
  // `new Date(null)` is the epoch, which would render as "20000d ago" rather
  // than admitting the timestamp is missing.
  if (!iso) return 'unknown';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const millis = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

export function useRecentActivity(limit = 5) {
  const { data, loading, error, refresh } = useAsyncData<ActivityItem[]>(
    async () => {
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
      if (txRes.error) throw txRes.error;
      if (expRes.error) throw expRes.error;

      const txItems: ActivityItem[] = txRes.data.map((t) => ({
        id: `tx-${t.id}`,
        kind: t.filled_sent > 0 ? 'dispatch' : 'return',
        title: t.filled_sent > 0 ? 'Cylinders Dispatched' : 'Empties Received',
        subtitle:
          t.filled_sent > 0
            ? `To: ${t.parties?.name ?? 'Unknown party'}`
            : `${t.empty_received} units from ${t.parties?.name ?? 'Unknown party'}`,
        timestamp: t.created_at,
      }));

      const expItems: ActivityItem[] = expRes.data.map((e) => ({
        id: `exp-${e.id}`,
        kind: 'expense',
        title: 'Expense Logged',
        subtitle: `${e.category}${e.note ? ` - ${e.note}` : ''}`,
        timestamp: e.created_at,
      }));

      return [...txItems, ...expItems]
        // Undated rows sort last rather than to the epoch-adjacent middle.
        .sort((a, b) => millis(b.timestamp) - millis(a.timestamp))
        .slice(0, limit);
    },
    {
      fallbackMessage: 'Could not load recent activity.',
      context: 'useRecentActivity',
      deps: [limit],
    }
  );

  return { items: orEmpty(data), loading, error, timeAgo, refresh };
}
