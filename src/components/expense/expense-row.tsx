import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { categoryColor } from '@/lib/expense-categories';
import { formatCurrency, formatDisplayDate } from '@/lib/format';
import type { Expense } from '@/types/db';

interface ExpenseRowProps {
  expense: Expense;
  loggedBy: string;
}

export function ExpenseRow({ expense, loggedBy }: ExpenseRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.accent, { backgroundColor: categoryColor(expense.category) }]} />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.category} numberOfLines={1}>
            {expense.category}
          </Text>
          <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
        </View>
        {expense.note ? (
          <Text style={styles.note} numberOfLines={2}>
            {expense.note}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          {formatDisplayDate(expense.date)} · {loggedBy}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: spacing.sm + 2,
    gap: 4,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  category: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  amount: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  note: {
    ...typography.body,
    color: colors.textSecondary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
