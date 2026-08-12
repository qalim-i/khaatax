import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ErrorBanner } from '@/components/ui/error-banner';
import { SelectField } from '@/components/ui/select-field';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useRecordPayment } from '@/hooks/use-record-payment';
import { toIsoDate } from '@/lib/date';
import { notify } from '@/lib/dialog';
import { formatCurrencyExact, formatDisplayDate } from '@/lib/format';
import { parseAmount } from '@/lib/money';
import { dueLabel, dueMagnitude, dueState } from '@/lib/receivables';
import type { PaymentMethod } from '@/types/db';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

/**
 * Record Payment (migration 0010).
 *
 * Reached from a party's detail screen, which passes the party through route
 * params — the party is never chosen here. Payments are recorded against a
 * specific party by definition, and a picker would let a user post a receipt to
 * the wrong account with one mis-tap on a screen they arrived at from the right
 * one.
 */
export default function NewPaymentScreen() {
  const { partyId, partyName, amountDue } = useLocalSearchParams<{
    partyId: string;
    partyName?: string;
    amountDue?: string;
  }>();
  const { submit, submitting } = useRecordPayment();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string | null>('cash');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Route params are strings. A missing or unparseable value means "unknown", not
  // zero — the outstanding line is simply not shown rather than asserting settled.
  const parsedDue = amountDue === undefined ? null : Number(amountDue);
  const knownDue = parsedDue !== null && Number.isFinite(parsedDue) ? parsedDue : null;

  const amountValue = parseAmount(amount);
  const amountIsValid = amountValue !== null && amountValue > 0;
  const amountError =
    amountValue === null
      ? 'Amount must be rupees (up to two decimals).'
      : amount.trim() !== '' && amountValue === 0
        ? 'A payment has to be more than zero.'
        : null;

  // Not an error: an advance, or an overpayment on a rounded bill, is ordinary
  // and the ledger carries it as credit. Worth saying out loud before saving,
  // though, since it is also what a mis-typed extra digit looks like.
  const overpayNotice =
    knownDue !== null && amountIsValid && amountValue > knownDue && knownDue > 0
      ? `That is ${formatCurrencyExact(amountValue - knownDue)} more than outstanding — the balance will carry as credit.`
      : null;

  const canSubmit = !!partyId && amountIsValid && !!method && !submitting;

  async function handleSubmit() {
    if (!partyId || !amountIsValid || !method) return;

    const { payment, error: failure } = await submit({
      party_id: partyId,
      date: toIsoDate(date),
      amount: amountValue,
      method: method as PaymentMethod,
      note: note.trim() ? note.trim() : null,
    });

    if (payment) {
      notify('Payment Recorded', `${formatCurrencyExact(payment.amount)} received`);
      router.back();
    } else {
      notify('Failed to record payment', failure ?? 'The payment could not be saved.');
    }
  }

  return (
    <View style={styles.container}>
      <TopAppBar
        title="KhaataX"
        leftIcon="chevron-right"
        leftIconRotation={180}
        onLeftPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>Record Payment</Text>
          <Text style={styles.subtitle}>
            {partyName ? `Money received from ${partyName}.` : 'Money received from this party.'}
          </Text>
        </View>

        <View style={styles.card}>
          {knownDue !== null ? (
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>{dueLabel(knownDue)}</Text>
              <Text
                style={[
                  styles.dueValue,
                  { color: dueState(knownDue) === 'due' ? colors.danger : colors.success },
                ]}>
                {formatCurrencyExact(dueMagnitude(knownDue))}
              </Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Amount Received</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            {knownDue !== null && knownDue > 0 ? (
              <Pressable onPress={() => setAmount(String(knownDue))}>
                <Text style={styles.fillFull}>
                  Pay full outstanding · {formatCurrencyExact(knownDue)}
                </Text>
              </Pressable>
            ) : null}
            <ErrorBanner message={amountError} />
            {overpayNotice ? <Text style={styles.notice}>{overpayNotice}</Text> : null}
          </View>

          <SelectField
            label="Method"
            placeholder="Select Method..."
            value={method}
            onChange={setMethod}
            options={METHODS.map((m) => ({ value: m.value, label: m.label }))}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <Pressable style={styles.dateControl} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>{formatDisplayDate(toIsoDate(date))}</Text>
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_event, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) setDate(selected);
                }}
              />
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Cheque no. 004512"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>

          <Text style={styles.immutableHint}>
            Payments can&apos;t be edited once saved — remove and re-record to correct one.
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}>
              <Text style={styles.submitLabel} numberOfLines={1}>
                {submitting ? 'Saving...' : 'Record Payment'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  headerBlock: {
    gap: 4,
  },
  h1: {
    ...typography.h2,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg + 1,
    gap: spacing.lg,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dueLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dueValue: {
    ...typography.statValue,
    fontWeight: '700',
  },
  field: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#8D8D8D',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  currencyPrefix: {
    ...typography.statValue,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    height: '100%',
    ...typography.statValue,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  fillFull: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  notice: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dateControl: {
    height: 40,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#6B7280',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  dateText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  noteInput: {
    minHeight: 72,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#8D8D8D',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  immutableHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Same shrink/grow split as New Transaction — see the note there.
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  cancelButton: {
    flexShrink: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    height: 48,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  submitButton: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 48,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
});
