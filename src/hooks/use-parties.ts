import { orEmpty, useAsyncData } from '@/hooks/use-async-data';
import { supabase } from '@/lib/supabase';

/**
 * The party list behind the New Transaction picker. Exposes `refresh` so a party
 * created elsewhere (the Party Ledger screen) shows up without remounting the
 * app — callers pair this with `useRefreshOnFocus`.
 */
export function useParties() {
  const { data, loading, error, refresh } = useAsyncData(
    async () => {
      const { data, error } = await supabase.from('parties').select('*').order('name');
      if (error) throw error;
      return data;
    },
    { fallbackMessage: 'Could not load parties.', context: 'useParties' }
  );

  return { parties: orEmpty(data), loading, error, refresh };
}
