import { useState } from 'react';

import { logError, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Payment, PaymentMethod, RecordPaymentInput } from '@/types/db';

export interface RecordPaymentOutcome {
  payment: Payment | null;
  error: string | null;
}

/**
 * Records money received from a party (migration 0010).
 *
 * An RPC rather than a plain insert, for the same reason `create_transaction` is
 * one: the write and the balance move have to be atomic. `payments` has no client
 * INSERT grant, so this is the only way in — a direct POST to PostgREST would add
 * a payment row while `parties.amount_due` kept claiming the money was still
 * owed, with nothing to notice the gap.
 */
export function useRecordPayment() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Returns the failure message alongside the row rather than leaving the caller
   * to read `error` off this hook — hook state read inside the callback that
   * triggered the save is the previous render's value. Same trap, same fix, as
   * `useCreateTransaction`.
   */
  async function submit(input: RecordPaymentInput): Promise<RecordPaymentOutcome> {
    setSubmitting(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('record_payment', {
      p_party_id: input.party_id,
      p_date: input.date,
      p_amount: input.amount,
      p_method: input.method,
      // The generated Args type models every function parameter as non-null:
      // PostgREST's schema output carries no nullability for arguments. `p_note
      // text` does take SQL NULL — record_payment normalises it with
      // `nullif(btrim(p_note), '')` — and an absent note is genuinely null, so
      // this asserts over a generator limitation, not over a real constraint.
      p_note: input.note as string,
    });

    setSubmitting(false);

    if (rpcError) {
      logError('useRecordPayment', rpcError);
      const message = toUserMessage(rpcError, 'Could not record the payment.');
      setError(message);
      return { payment: null, error: message };
    }

    return { payment: { ...data, method: data.method as PaymentMethod }, error: null };
  }

  return { submit, submitting, error };
}

/**
 * Removes a payment and puts the money back on `amount_due`.
 *
 * Payments are immutable — there is no edit path — so this is how a mis-keyed
 * figure is corrected: delete, then re-record. The RPC restores the balance in
 * the same database transaction as the delete, which a DELETE grant could not do.
 */
export function useDeletePayment() {
  const [deleting, setDeleting] = useState(false);

  async function remove(paymentId: string): Promise<string | null> {
    setDeleting(true);
    const { error: rpcError } = await supabase.rpc('delete_payment', {
      p_payment_id: paymentId,
    });
    setDeleting(false);

    if (rpcError) {
      logError('useDeletePayment', rpcError);
      return toUserMessage(rpcError, 'Could not remove the payment.');
    }
    return null;
  }

  return { remove, deleting };
}
