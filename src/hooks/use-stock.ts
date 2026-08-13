import { useCallback } from 'react';

import { orEmpty, useAsyncData } from '@/hooks/use-async-data';
import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { StockStatus } from '@/types/db';

export function useStock() {
  const { data, loading, error, refresh } = useAsyncData(
    async () => {
      const { data, error } = await supabase.from('stock').select('*');
      if (error) throw error;
      return data.map((row) => ({ ...row, status: row.status as StockStatus }));
    },
    { fallbackMessage: 'Could not load stock levels.', context: 'useStock' }
  );

  const rows = orEmpty(data);

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
        return toUserMessage(rpcError, 'Could not adjust stock.');
      }

      await refresh();
      return null;
    },
    [refresh]
  );

  const quantityOf = useCallback(
    (status: StockStatus) => rows.find((r) => r.status === status)?.quantity ?? 0,
    [rows]
  );

  return { rows, loading, error, refresh, adjust, quantityOf };
}
