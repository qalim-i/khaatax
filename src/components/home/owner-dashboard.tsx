import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Icon } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { QuickActionButton } from '@/components/ui/quick-action-button';
import { SectionHeader } from '@/components/ui/section-header';
import { StatTile } from '@/components/ui/stat-tile';
import { colors, spacing, typography } from '@/constants/design-tokens';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { formatCurrency } from '@/lib/format';

export function OwnerDashboard() {
  const { data, loading, error, refresh } = useHomeDashboard(true);

  useRefreshOnFocus(refresh);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={styles.h2}>Overview</Text>
        <Text style={styles.subtitle}>Daily snapshot for KhaataX operations</Text>
      </View>

      {/* Without this every tile reads 0 on a denied query, with nothing to say why. */}
      <ErrorBanner message={error} />

      <Card>
        <SectionHeader
          icon={<Icon name="cylinder" width={16} height={20} color={colors.textPrimary} />}
          title="Cylinder Status"
          actionLabel="View All"
          onActionPress={() => router.push('/cylinders/stock')}
        />
        <View style={styles.statsRow}>
          <StatTile label="Filled" value={loading ? '—' : data?.filled ?? 0} valueColor={colors.success} />
          <StatTile label="Empty" value={loading ? '—' : data?.empty ?? 0} valueColor={colors.danger} bordered />
          <StatTile
            label="Outstanding"
            value={loading ? '—' : data?.outstanding ?? 0}
            valueColor={colors.primary}
            bordered
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          icon={<Icon name="wallet" width={22} height={16} color={colors.textPrimary} />}
          title="Expense MTD"
          actionLabel="View All"
          onActionPress={() => router.push('/expenses')}
        />
        <View>
          <Text style={styles.bigStat}>{loading ? '—' : formatCurrency(data?.expenseMtd ?? 0)}</Text>
        </View>
      </Card>

      <Card>
        <SectionHeader
          icon={<Icon name="people" width={22} height={16} color={colors.textPrimary} />}
          title="Payroll Summary"
          actionLabel="View All"
          onActionPress={() => router.push('/more/payroll')}
        />
        <View>
          <Text style={styles.bigStat}>{loading ? '—' : formatCurrency(data?.payrollMonthlyTotal ?? 0)}</Text>
        </View>
        <View style={styles.payrollAction}>
          <PrimaryButton label="Manage Payroll" onPress={() => router.push('/more/payroll')} />
        </View>
      </Card>

      <Card>
        <SectionHeader icon={<Icon name="bolt" width={16} height={20} color={colors.textPrimary} />} title="Quick Actions" />
        <View style={styles.actionsGrid}>
          <QuickActionButton icon="plus-circle" label="New Order" onPress={() => router.push('/cylinders/new-transaction')} />
          <QuickActionButton icon="clipboard-list" label="Record Expense" onPress={() => router.push('/expenses/new')} />
          <QuickActionButton icon="truck" label="Dispatch" onPress={() => router.push('/cylinders/new-transaction')} />
          <QuickActionButton icon="inventory-audit" label="Inventory Audit" onPress={() => router.push('/cylinders/stock')} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
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
  h2: {
    ...typography.h2,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  bigStat: {
    ...typography.statValueLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  payrollAction: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
