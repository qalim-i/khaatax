import { useEffect, useState } from 'react';

import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/types/db';

/**
 * The fixed staff list (1 owner + 2-3 managers), used to resolve `created_by`
 * ids to names and to populate the "logged by" filter. Small and stable enough
 * to fetch whole and match in memory rather than joining on every list query.
 *
 * Requires the `read_all_users` policy from migration 0004; without it this
 * returns only the signed-in user.
 */
export function useAppUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .order('name')
      .then(({ data, error: fetchError }) => {
        // Silently dropping this made every name resolve to 'Unknown' with no
        // indication that the lookup had failed rather than come back empty.
        if (fetchError) logError('useAppUsers', fetchError);
        setError(fetchError ? toUserMessage(fetchError, 'Could not load the staff list.') : null);
        setUsers((data as AppUser[]) ?? []);
        setLoading(false);
      });
  }, []);

  function nameFor(userId: string): string {
    return users.find((u) => u.id === userId)?.name ?? 'Unknown';
  }

  return { users, loading, error, nameFor };
}
