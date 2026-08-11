import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import type { TransactionWithRunningBalance } from '@/hooks/use-party-detail';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TransactionRow({ tx }: { tx: TransactionWithRunningBalance }) {
  return (
    <View style={styles.row}>
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
      <Text style={styles.cylinderType}>{tx.cylinder_type}</Text>
    </View>
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
  cylinderType: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
});
