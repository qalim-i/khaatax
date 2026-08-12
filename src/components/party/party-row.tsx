import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import type { PartyLedgerRow } from '@/hooks/use-party-ledger';
import { formatCurrencyExact } from '@/lib/format';
import { dueLabel, dueMagnitude, dueState } from '@/lib/receivables';

interface PartyRowProps {
  row: PartyLedgerRow;
  onPress: () => void;
}

export function PartyRow({ row, onPress }: PartyRowProps) {
  const { party, filledSentMtd, emptyReceivedMtd } = row;
  // Two independent settlements: cylinders back, and money paid. The chip tracks
  // cylinders (what this screen has always been about); the money line below
  // carries its own state.
  const isSettled = party.balance === 0;
  const owesMoney = dueState(party.amount_due) === 'due';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.topLine}>
        <Text style={styles.name} numberOfLines={1}>
          {party.name}
        </Text>
        <View style={[styles.chip, isSettled ? styles.chipSettled : styles.chipPending]}>
          <Text style={[styles.chipLabel, isSettled ? styles.chipLabelSettled : styles.chipLabelPending]}>
            {isSettled ? 'Settled' : 'Pending'}
          </Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Filled Sent</Text>
          <Text style={styles.statValue}>{filledSentMtd}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Empty Rcvd</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>{emptyReceivedMtd}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cylinders</Text>
          <Text style={[styles.statValue, { color: isSettled ? colors.success : colors.danger }]}>
            {party.balance}
          </Text>
        </View>
      </View>
      {/*
        The money line, kept off the cylinder stats row: the three figures above
        are all counts, and dropping a rupee figure among them was the single
        easiest way to have someone read "12" as ₹12.
      */}
      <View style={styles.dueLine}>
        <Text style={styles.statLabel}>{dueLabel(party.amount_due)}</Text>
        <Text
          style={[
            styles.dueValue,
            { color: owesMoney ? colors.danger : colors.success },
          ]}>
          {formatCurrencyExact(dueMagnitude(party.amount_due))}
        </Text>
      </View>
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
    gap: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  name: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  chip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
  },
  chipPending: {
    backgroundColor: '#FFF1F1',
  },
  chipSettled: {
    backgroundColor: '#A7F0BA',
  },
  chipLabel: {
    ...typography.caption,
    fontWeight: '500',
  },
  chipLabelPending: {
    color: '#750E13',
  },
  chipLabelSettled: {
    color: '#044317',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  dueLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dueValue: {
    ...typography.body,
    fontWeight: '700',
  },
});
