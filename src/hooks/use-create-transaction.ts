import { useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { CreateTransactionInput, Transaction } from '@/types/db';

export function useCreateTransaction() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(input: CreateTransactionInput): Promise<Transaction | null> {
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('create_transaction', {
      p_party_id: input.party_id,
      p_date: input.date,
      p_cylinder_type: input.cylinder_type,
      p_filled_sent: input.filled_sent,
      p_empty_received: input.empty_received,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return null;
    }
    return data as Transaction;
  }

  return { submit, submitting, error };
}
