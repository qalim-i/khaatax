import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import type { TransactionWithRunningBalance } from '@/hooks/use-party-detail';
import { formatCurrencyExact } from '@/lib/format';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface TransactionRowProps {
  tx: TransactionWithRunningBalance;
  /** Opens the Invoice/DC export sheet for this transaction (PRD INV-5). */
  onPress?: () => void;
}

export function TransactionRow({ tx, onPress }: TransactionRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
      onPress={onPress}
      disabled={!onPress}>
      <View style={styles.topLine}>
        <Text style={styles.date}>{formatDate(tx.date)}</Text>
        <Text style={styles.numbers}>
          INV-{tx.invoice_no} · DC-{tx.dc_no}
        </Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Filled Sent</Text>
          <Text style={styles.statValue}>{tx.filled_sent}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Empty Rcvd</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>{tx.empty_received}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Running Balance</Text>
          <Text style={[styles.statValue, { color: tx.runningBalance === 0 ? colors.success : colors.danger }]}>
            {tx.runningBalance}
          </Text>
        </View>
      </View>
      <View style={styles.footerLine}>
        <Text style={styles.cylinderType}>{tx.cylinder_type}</Text>
        {/*
          An em dash, not "₹0.00": transactions recorded before the amount field
          existed all carry 0, and showing a price there would be a claim the
          record does not support.
        */}
        <Text style={styles.amount}>
          {tx.amount > 0 ? formatCurrencyExact(tx.amount) : '—'}
        </Text>
      </View>
      {onPress ? <Text style={styles.exportHint}>Tap to export</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
    gap: spacing.xs,
  },
  rowPressed: {
    opacity: 0.7,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  numbers: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xxs,
  },
  stat: {
    gap: 2,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cylinderType: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  amount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  exportHint: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'right',
  },
});
