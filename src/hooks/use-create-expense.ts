import { useState } from 'react';

import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { CreateExpenseInput, Expense } from '@/types/db';

/**
 * Logs an expense directly — there is no approval step by design (PRD EXP-1), so
 * this is a plain insert rather than an RPC.
 *
 * `created_by` is NOT sent. It used to be read from the session here and included
 * in the payload, which meant the client asserted its own identity: the `with
 * check` clause validated the caller's role but never that `created_by` matched
 * them, so any manager could log an expense under a colleague's name. Migration
 * 0007 moves attribution to a column DEFAULT of `auth.uid()` and revokes INSERT
 * on the column, so the database now stamps it and the client cannot override it.
 * That also removes the `getUser()` round-trip this function used to make first.
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
      const { data, error: insertError } = await supabase
        .from('expenses')
        .insert(input)
        .select()
        .single();

      if (insertError) {
        logError('useCreateExpense', insertError);
        const message = toUserMessage(insertError, 'Could not log the expense.');
        setError(message);
        return { expense: null, error: message };
      }

      return { expense: data as Expense, error: null };
    } catch (err) {
      logError('useCreateExpense', err);
      const message = toUserMessage(err, 'Could not log the expense.');
      setError(message);
      return { expense: null, error: message };
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting, error };
}
