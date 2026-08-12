import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { PartyInput } from '@/types/db';

/**
 * Creates a party (customer). A plain insert — unlike a transaction there is no
 * sequence to protect and nothing else to update atomically, so no RPC is needed.
 *
 * `balance` is never supplied here. It starts at the column default of 0 and is
 * only ever moved by the `create_transaction` function; letting the client seed
 * it would break that invariant.
 *
 * Both owner and manager may insert — the `owner_and_manager_full_access` policy
 * on `parties` (migration 0005) covers INSERT through its `with check` clause.
 *
 * `create` returns the failure message, or null on success, rather than a bare
 * boolean. Callers need the message in the same tick they triggered the save;
 * reading it back off hook state would give them the previous render's value.
 */
export function useCreateParty() {
  const [submitting, setSubmitting] = useState(false);

  const create = useCallback(async (input: PartyInput): Promise<string | null> => {
    setSubmitting(true);

    try {
      const { error } = await supabase.from('parties').insert(input);
      return error ? error.message : null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not create party.';
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { create, submitting };
}
