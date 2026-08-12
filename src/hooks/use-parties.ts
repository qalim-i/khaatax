import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Party } from '@/types/db';

/**
 * The party list behind the New Transaction picker. Exposes `refresh` so a party
 * created elsewhere (the Party Ledger screen) shows up without remounting the
 * app — callers pair this with `useRefreshOnFocus`.
 */
export function useParties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase.from('parties').select('*').order('name');
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setParties((data as Party[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { parties, loading, error, refresh: load };
}
