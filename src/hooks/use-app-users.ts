import { orEmpty, useAsyncData } from '@/hooks/use-async-data';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/db';

/**
 * The fixed staff list (1 owner + 2-3 managers), used to resolve `created_by`
 * ids to names and to populate the "logged by" filter. Small and stable enough
 * to fetch whole and match in memory rather than joining on every list query.
 *
 * Requires the `read_all_users` policy from migration 0004; without it this
 * returns only the signed-in user.
 */
export function useAppUsers() {
  const { data, loading, error, refresh } = useAsyncData(
    async () => {
      const { data, error } = await supabase.from('users').select('*').order('name');
      // Silently dropping this made every name resolve to 'Unknown' with no
      // indication that the lookup had failed rather than come back empty.
      if (error) throw error;
      return data.map((row) => ({ ...row, role: row.role as UserRole }));
    },
    { fallbackMessage: 'Could not load the staff list.', context: 'useAppUsers' }
  );

  const users = orEmpty(data);

  function nameFor(userId: string): string {
    return users.find((u) => u.id === userId)?.name ?? 'Unknown';
  }

  return { users, loading, error, refresh, nameFor };
}
