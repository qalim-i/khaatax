import { useCallback, useEffect, useState } from 'react';

import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Stock, StockStatus } from '@/types/db';

export function useStock() {
  const [rows, setRows] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase.from('stock').select('*');
    if (fetchError) {
      logError('useStock.load', fetchError);
      setError(toUserMessage(fetchError, 'Could not load stock levels.'));
    } else {
      setError(null);
      setRows(data as Stock[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Applies a delta server-side via the `adjust_stock` RPC (migration 0007).
   *
   * This used to read the current quantity out of `rows`, add the delta in JS and
   * write the resulting absolute value back. That is a read-modify-write across a
   * network round-trip: two managers adjusting at once, or one acting on a screen
   * that had gone stale, silently overwrote each other's change. The RPC does
   * `quantity = greatest(0, quantity + delta)` in a single UPDATE, so concurrent
   * adjustments compose instead of clobbering, and the floor is enforced by the
   * database rather than by client-side `Math.max`.
   */
  const adjust = useCallback(
    async (status: StockStatus, delta: number) => {
      const { error: rpcError } = await supabase.rpc('adjust_stock', {
        p_status: status,
        p_delta: delta,
      });

      if (rpcError) {
        logError('useStock.adjust', rpcError);
        setError(toUserMessage(rpcError, 'Could not adjust stock.'));
        return false;
      }

      await load();
      return true;
    },
    [load]
  );

  const quantityOf = useCallback(
    (status: StockStatus) => rows.find((r) => r.status === status)?.quantity ?? 0,
    [rows]
  );

  return { rows, loading, error, refresh: load, adjust, quantityOf };
}
