import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useRecentActivity } from '@/hooks/use-recent-activity';

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const activityIcon: Record<string, IconName> = {
  dispatch: 'truck',
  return: 'tank',
  expense: 'wallet',
};

export function ManagerDashboard() {
  const { data, loading } = useHomeDashboard(false);
  const { items, timeAgo } = useRecentActivity(3);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={styles.h1}>Good Morning, Manager</Text>
        <Text style={styles.subtitle}>Here is your daily operational overview.</Text>
      </View>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeaderRow}>
            <View style={styles.kpiHeaderLeft}>
              <Icon name="cylinder" width={16} height={20} color={colors.textPrimary} />
              <Text style={styles.kpiTitle}>Cylinder Status</Text>
            </View>
            <Pressable onPress={() => router.push('/cylinders/stock')} hitSlop={8}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.kpiStatsRow}>
            <View style={styles.kpiStat}>
              <Text style={styles.kpiValue}>{loading ? '—' : data?.filled ?? 0}</Text>
              <Text style={styles.kpiLabel}>Filled</Text>
            </View>
            <View style={[styles.kpiStat, styles.kpiStatBordered]}>
              <Text style={styles.kpiValue}>{loading ? '—' : data?.empty ?? 0}</Text>
              <Text style={[styles.kpiLabel, { color: colors.danger }]}>Empty</Text>
            </View>
            <View style={[styles.kpiStat, styles.kpiStatBordered]}>
              <Text style={styles.kpiValue}>{loading ? '—' : data?.outstanding ?? 0}</Text>
              <Text style={styles.kpiLabel}>Out</Text>
            </View>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeaderLeft}>
            <Icon name="wallet" width={22} height={16} color={colors.textPrimary} />
            <Text style={styles.kpiTitle}>Expense MTD</Text>
          </View>
          <Text style={styles.bigStat}>{loading ? '—' : formatCurrency(data?.expenseMtd ?? 0)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Pressable
            style={[styles.actionButton, styles.actionPrimary]}
            onPress={() => router.push('/cylinders/new-transaction')}>
            <Icon name="plus-circle" width={20} height={20} color={colors.white} />
            <Text style={[styles.actionLabel, { color: colors.white }]}>New Order</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.actionSecondary]} onPress={() => router.push('/expenses')}>
            <Icon name="clipboard-list" width={18} height={20} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.primary }]}>Record Expense</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.actionNeutral]}
            onPress={() => router.push('/cylinders/new-transaction')}>
            <Icon name="truck" width={22} height={16} color={colors.textPrimary} />
            <Text style={styles.actionLabel}>Dispatch</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.actionNeutral]}
            onPress={() => router.push('/cylinders/stock')}>
            <Icon name="inventory-audit" width={20} height={20} color={colors.textPrimary} />
            <Text style={styles.actionLabel}>Inventory Audit</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.activityHeaderRow}>
          <Text style={styles.sectionLabel}>Recent Activity</Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>
        <View style={styles.activityList}>
          {items.map((item, index) => (
            <View key={item.id} style={[styles.activityRow, index > 0 && styles.activityRowBorder]}>
              <View style={styles.activityIconWrap}>
                <Icon name={activityIcon[item.kind]} width={16} height={16} color={colors.textSecondary} />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.activityTime}>{timeAgo(item.timestamp)}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
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
  kpiGrid: {
    gap: spacing.md,
  },
  kpiCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md - 1,
    gap: spacing.sm,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kpiTitle: {
    ...typography.h3,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  viewAll: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.primary,
  },
  kpiStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs + 1,
    gap: spacing.xs,
  },
  kpiStat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  kpiStatBordered: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.xs + 1,
  },
  kpiValue: {
    ...typography.statValue,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  bigStat: {
    ...typography.statValueLarge,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 90,
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  actionNeutral: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  actionLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityList: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  activityRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  activitySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  activityTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
