import { useState } from 'react';

import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { CreateTransactionInput, Transaction } from '@/types/db';

export interface CreateTransactionOutcome {
  transaction: Transaction | null;
  error: string | null;
}

export function useCreateTransaction() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Returns the failure message alongside the row rather than leaving the caller
   * to read `error` off this hook. A caller that reads hook state inside the same
   * callback that triggered the save sees the *previous* render's value — which
   * is null on the first attempt, so the first failure produced no message at
   * all. Returning it removes that trap.
   */
  async function submit(input: CreateTransactionInput): Promise<CreateTransactionOutcome> {
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('create_transaction', {
      p_party_id: input.party_id,
      p_date: input.date,
      p_cylinder_type: input.cylinder_type,
      p_filled_sent: input.filled_sent,
      p_empty_received: input.empty_received,
      p_amount: input.amount,
    });
    setSubmitting(false);
    if (rpcError) {
      logError('useCreateTransaction', rpcError);
      const message = toUserMessage(rpcError, 'Could not save the transaction.');
      setError(message);
      return { transaction: null, error: message };
    }
    return { transaction: data as Transaction, error: null };
  }

  return { submit, submitting, error };
}
