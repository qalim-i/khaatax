import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { formatCurrencyExact, formatDisplayDate } from '@/lib/format';
import type { Payment } from '@/types/db';

const METHOD_LABELS: Record<Payment['method'], string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
};

interface PaymentRowProps {
  payment: Payment;
  /**
   * Removes the payment and returns the money to the party's balance. Absent when
   * the signed-in user didn't record it — the RPC enforces that too, but a button
   * that always fails is worse than no button.
   */
  onRemove?: () => void;
}

export function PaymentRow({ payment, onRemove }: PaymentRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <Text style={styles.amount}>{formatCurrencyExact(payment.amount)}</Text>
        <Text style={styles.meta}>
          {formatDisplayDate(payment.date)} · {METHOD_LABELS[payment.method] ?? payment.method}
        </Text>
        {payment.note ? <Text style={styles.note}>{payment.note}</Text> : null}
      </View>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => [pressed ? styles.removePressed : null]}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  amount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.success,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  remove: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  removePressed: {
    opacity: 0.6,
  },
});
