import { useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { CreateExpenseInput, Expense } from '@/types/db';

/**
 * Logs an expense directly — there is no approval step by design (PRD EXP-1),
 * so this is a plain insert rather than an RPC. `created_by` is stamped from the
 * session here; unlike invoice/DC numbers there is no sequence to protect, so no
 * server-side function is needed.
 */
export interface CreateExpenseResult {
  expense: Expense | null;
  error: string | null;
}

export function useCreateExpense() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Returns the failure message alongside the row rather than leaving the caller
   * to read `error` off this hook. A caller that reads hook state inside the same
   * callback that triggered the save sees the *previous* render's value — which
   * is null on the first attempt, so the first failure produced no message at
   * all. Returning it removes that trap.
   */
  async function submit(input: CreateExpenseInput): Promise<CreateExpenseResult> {
    setSubmitting(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        const message = authError?.message ?? 'You are signed out. Sign in again to log an expense.';
        setError(message);
        return { expense: null, error: message };
      }

      const { data, error: insertError } = await supabase
        .from('expenses')
        .insert({ ...input, created_by: userId })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return { expense: null, error: insertError.message };
      }

      return { expense: data as Expense, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not log expense.';
      setError(message);
      return { expense: null, error: message };
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting, error };
}
