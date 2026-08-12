import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { formatCurrency } from '@/lib/format';
import { UNASSIGNED_ROLE } from '@/lib/payroll';
import type { Employee } from '@/types/db';

interface EmployeeRowProps {
  employee: Employee;
  onEdit: () => void;
  onToggleActive: () => void;
}

export function EmployeeRow({ employee, onEdit, onToggleActive }: EmployeeRowProps) {
  const role = employee.role?.trim() ? employee.role.trim() : UNASSIGNED_ROLE;

  return (
    <View style={[styles.row, !employee.active && styles.rowInactive]}>
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>
            {employee.name}
          </Text>
          {!employee.active ? (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Removed</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.role}>{role}</Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.pay, !employee.active && styles.payInactive]}>
          {formatCurrency(employee.monthly_pay)}
        </Text>
        <Text style={styles.payCaption}>per month</Text>
        <View style={styles.actions}>
          <Pressable onPress={onEdit} hitSlop={8}>
            <Text style={styles.actionLabel}>Edit</Text>
          </Pressable>
          <Pressable onPress={onToggleActive} hitSlop={8}>
            <Text style={[styles.actionLabel, employee.active && styles.actionDanger]}>
              {employee.active ? 'Remove' : 'Restore'}
            </Text>
          </Pressable>
        </View>
      </View>
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
  rowInactive: {
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  chip: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
  },
  chipLabel: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  role: {
    ...typography.body,
    color: colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pay: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  payInactive: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  payCaption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.primary,
  },
  actionDanger: {
    color: colors.danger,
  },
});
