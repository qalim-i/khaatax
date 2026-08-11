import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { categoryColor } from '@/lib/expense-categories';
import { formatCurrency } from '@/lib/format';
import type { CategorySlice } from '@/hooks/use-expense-dashboard';

interface CategoryBreakdownProps {
  data: CategorySlice[];
  onSelect: (category: string) => void;
}

/**
 * Where the money went, ranked (PRD EXP-3). Horizontal bars rather than a pie:
 * they stay readable at a dozen categories, put the amounts on the same baseline
 * for comparison, and each row is a full-width tap target for the
 * tap-to-filter-the-list behaviour the spec asks for.
 */
export function CategoryBreakdown({ data, onSelect }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return <Text style={styles.empty}>No spend recorded for this period.</Text>;
  }

  return (
    <View style={styles.list}>
      {data.map((slice) => (
        <Pressable
          key={slice.category}
          onPress={() => onSelect(slice.category)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={styles.labelRow}>
            <View style={[styles.swatch, { backgroundColor: categoryColor(slice.category) }]} />
            <Text style={styles.category} numberOfLines={1}>
              {slice.category}
            </Text>
            <Text style={styles.amount}>{formatCurrency(slice.amount)}</Text>
            <Text style={styles.share}>{Math.round(slice.share * 100)}%</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  // Sub-1% slices still get a visible sliver.
                  width: `${Math.max(1, slice.share * 100)}%`,
                  backgroundColor: categoryColor(slice.category),
                },
              ]}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    gap: 6,
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  category: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  amount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  share: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 34,
    textAlign: 'right',
  },
  track: {
    height: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radius.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
});
