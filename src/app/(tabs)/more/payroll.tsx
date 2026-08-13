import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmployeeFormModal } from '@/components/payroll/employee-form-modal';
import { EmployeeRow } from '@/components/payroll/employee-row';
import { Icon } from '@/components/ui/icon';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useAuth } from '@/hooks/use-auth';
import { useEmployees } from '@/hooks/use-employees';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { confirmAction } from '@/lib/dialog';
import { formatCurrency } from '@/lib/format';
import type { Employee, EmployeeInput } from '@/types/db';

export default function PayrollScreen() {
  const { appUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <PayrollAppBar />
        <ActivityIndicator style={styles.centered} color={colors.primary} />
      </View>
    );
  }

  // Managers can reach this path by deep link even though the More screen hides
  // the entry point. Bail out before mounting the data hook so no payroll query
  // is issued at all — the RLS policy would return nothing anyway, but there is
  // no reason to ask.
  if (appUser?.role !== 'owner') {
    return (
      <View style={styles.container}>
        <PayrollAppBar />
        <View style={styles.centered}>
          <Text style={styles.deniedTitle}>Not available</Text>
          <Text style={styles.deniedBody}>Payroll is restricted to the business owner.</Text>
        </View>
      </View>
    );
  }

  return <PayrollContent />;
}

function PayrollAppBar() {
  return (
    <TopAppBar
      title="KhaataX"
      leftIcon="chevron-right"
      leftIconRotation={180}
      onLeftPress={() => router.back()}
      rightIcon="account"
      onRightPress={() => router.push('/profile')}
    />
  );
}

function PayrollContent() {
  const {
    employees,
    summary,
    initialLoading,
    error,
    showInactive,
    setShowInactive,
    create,
    update,
    setActive,
    refresh,
  } = useEmployees();

  useRefreshOnFocus(refresh);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(employee: Employee) {
    setEditing(employee);
    setFormOpen(true);
  }

  async function handleSubmit(input: EmployeeInput) {
    return editing ? update(editing.id, input) : create(input);
  }

  async function confirmToggle(employee: Employee) {
    if (!employee.active) {
      setActive(employee.id, true);
      return;
    }
    const confirmed = await confirmAction({
      title: 'Remove from payroll?',
      message: `${employee.name} will stop counting toward payroll cost. Their record is kept and can be restored.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (confirmed) setActive(employee.id, false);
  }

  return (
    <View style={styles.container}>
      <PayrollAppBar />
      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.headerBlock}>
              <Text style={styles.h1}>Payroll</Text>
              <Text style={styles.subtitle}>Owner only. Managers cannot see this data.</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TOTAL MONTHLY PAYROLL</Text>
              <Text style={styles.summaryValue}>
                {initialLoading ? '—' : formatCurrency(summary.monthlyTotal)}
              </Text>

              <View style={styles.summaryStatsRow}>
                <View style={styles.summaryStat}>
                  <Text style={styles.statLabel}>EMPLOYEES</Text>
                  <Text style={styles.statValue}>{initialLoading ? '—' : summary.activeCount}</Text>
                </View>
                <View style={[styles.summaryStat, styles.summaryStatBordered]}>
                  <Text style={styles.statLabel}>AVERAGE</Text>
                  <Text style={styles.statValue}>
                    {initialLoading ? '—' : formatCurrency(Math.round(summary.averagePay))}
                  </Text>
                </View>
                <View style={[styles.summaryStat, styles.summaryStatBordered]}>
                  <Text style={styles.statLabel}>ANNUAL</Text>
                  <Text style={styles.statValue}>
                    {initialLoading ? '—' : formatCurrency(summary.annualTotal)}
                  </Text>
                </View>
              </View>
            </View>

            {summary.byRole.length > 0 ? (
              <View style={styles.roleCard}>
                <Text style={styles.roleCardTitle}>Cost by Role</Text>
                {summary.byRole.map((role) => (
                  <View key={role.role} style={styles.roleRow}>
                    <Text style={styles.roleName} numberOfLines={1}>
                      {role.role}
                    </Text>
                    <Text style={styles.roleCount}>
                      {role.count} {role.count === 1 ? 'person' : 'people'}
                    </Text>
                    <Text style={styles.roleTotal}>{formatCurrency(role.total)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.listControls}>
              <Pressable style={styles.addButton} onPress={openAdd}>
                <Icon name="plus" width={14} height={14} color={colors.white} />
                <Text style={styles.addLabel}>Add Employee</Text>
              </Pressable>
              {summary.inactiveCount > 0 ? (
                <Pressable onPress={() => setShowInactive(!showInactive)} hitSlop={8}>
                  <Text style={styles.toggleLabel}>
                    {showInactive ? 'Hide' : 'Show'} removed ({summary.inactiveCount})
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {initialLoading ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <EmployeeRow
            employee={item}
            onEdit={() => openEdit(item)}
            onToggleActive={() => confirmToggle(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          !initialLoading ? (
            <Text style={styles.emptyState}>No employees on payroll yet. Add the first one above.</Text>
          ) : null
        }
      />

      <EmployeeFormModal
        visible={formOpen}
        employee={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    padding: spacing.lg,
  },
  deniedTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deniedBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    padding: spacing.md,
  },
  headerArea: {
    gap: spacing.md,
    marginBottom: spacing.md,
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
  error: {
    ...typography.body,
    color: colors.danger,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md - 1,
    gap: spacing.xs,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.statValueLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xxs,
  },
  summaryStat: {
    flex: 1,
    gap: 2,
  },
  summaryStatBordered: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.sm,
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
  roleCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md - 1,
    gap: spacing.xs,
  },
  roleCardTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roleName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  roleCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  roleTotal: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    minWidth: 80,
    textAlign: 'right',
  },
  listControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  addLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
  toggleLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.primary,
  },
  emptyState: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
