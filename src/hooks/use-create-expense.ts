import { useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { CreateExpenseInput, Expense } from '@/types/db';

/**
 * Logs an expense directly — there is no approval step by design (PRD EXP-1),
 * so this is a plain insert rather than an RPC. `created_by` is stamped from the
 * session here; unlike invoice/DC numbers there is no sequence to protect, so no
 * server-side function is needed.
 */
export function useCreateExpense() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(input: CreateExpenseInput): Promise<Expense | null> {
    setSubmitting(true);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      setError('You are signed out. Sign in again to log an expense.');
      setSubmitting(false);
      return null;
    }

    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert({ ...input, created_by: userId })
      .select()
      .single();

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return null;
    }
    return data as Expense;
  }

  return { submit, submitting, error };
}
