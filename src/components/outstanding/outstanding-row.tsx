import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { formatDisplayDate } from '@/lib/format';
import type { OutstandingReportRow } from '@/hooks/use-outstanding';

/** Aging bands for the overdue chip — 30/60 days is the usual follow-up ladder. */
function agingStyle(days: number) {
  if (days >= 60) return { background: '#FFF1F1', text: '#750E13', label: 'Critical' };
  if (days >= 30) return { background: '#FCF4D6', text: '#684E00', label: 'Overdue' };
  return { background: '#D0E2FF', text: '#002D9C', label: 'Current' };
}

interface OutstandingRowProps {
  row: OutstandingReportRow;
  onPress: () => void;
}

export function OutstandingRow({ row, onPress }: OutstandingRowProps) {
  const aging = agingStyle(row.overdueDays);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.topLine}>
        <Text style={styles.name} numberOfLines={1}>
          {row.partyName}
        </Text>
        <View style={[styles.chip, { backgroundColor: aging.background }]}>
          <Text style={[styles.chipLabel, { color: aging.text }]}>{aging.label}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cylinders</Text>
          <Text style={[styles.statValue, { color: colors.danger }]}>{row.quantity}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Type</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {row.cylinderType}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Days Out</Text>
          <Text style={styles.statValue}>{row.overdueDays}</Text>
        </View>
      </View>

      <Text style={styles.since}>Oldest unreturned since {formatDisplayDate(row.oldestDate)}</Text>
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
  chipLabel: {
    ...typography.caption,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  stat: {
    flex: 1,
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
  since: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
