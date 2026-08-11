import { useCallback, useEffect, useState } from 'react';

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
      setError(fetchError.message);
    } else {
      setError(null);
      setRows(data as Stock[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const adjust = useCallback(
    async (status: StockStatus, delta: number) => {
      const current = rows.find((r) => r.status === status)?.quantity ?? 0;
      const next = Math.max(0, current + delta);
      const { error: updateError } = await supabase
        .from('stock')
        .update({ quantity: next, updated_at: new Date().toISOString() })
        .eq('status', status);
      if (updateError) {
        setError(updateError.message);
        return false;
      }
      await load();
      return true;
    },
    [rows, load]
  );

  const quantityOf = useCallback((status: StockStatus) => rows.find((r) => r.status === status)?.quantity ?? 0, [rows]);

  return { rows, loading, error, refresh: load, adjust, quantityOf };
}
