import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Icon, type IconName } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { QuickActionButton } from '@/components/ui/quick-action-button';
import { SectionHeader } from '@/components/ui/section-header';
import { StatTile } from '@/components/ui/stat-tile';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useAuth } from '@/hooks/use-auth';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useRecentActivity } from '@/hooks/use-recent-activity';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { formatCurrency } from '@/lib/format';

const activityIcon: Record<string, IconName> = {
  dispatch: 'truck',
  return: 'tank',
  expense: 'wallet',
};

/*
  One dashboard for both roles. There used to be two — OwnerDashboard and
  ManagerDashboard — showing the same numbers in different layouts, so a manager and
  an owner were effectively using different apps and every change had to be made
  twice. The only real difference is Payroll, which is a single conditional block
  here. Hiding that block is presentation only; the `employees` table denies managers
  at the database level regardless (CLAUDE.md Non-Negotiable Rule 1).

  Section links use `router.navigate`, not `push`: these are places, and navigate
  unwinds to an existing route instead of stacking a second copy of, say, the
  Expenses dashboard on top of the Expenses tab. Quick Actions use `push` because
  they open root-level modals over the current screen.
*/
export function HomeDashboard() {
  const { appUser } = useAuth();
  const isOwner = appUser?.role === 'owner';

  const { data, loading, error, refresh } = useHomeDashboard(isOwner);
  const { items, error: activityError, timeAgo, refresh: refreshActivity } = useRecentActivity(3);

  const refreshAll = useCallback(() => {
    refresh();
    refreshActivity();
  }, [refresh, refreshActivity]);

  useRefreshOnFocus(refreshAll);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={styles.h2}>Overview</Text>
        <Text style={styles.subtitle}>Daily snapshot for KhaataX operations</Text>
      </View>

      {/* Without this every tile reads 0 on a denied query, with nothing to say why. */}
      <ErrorBanner message={error ?? activityError} />

      <Card>
        <SectionHeader
          icon={<Icon name="cylinder" width={16} height={20} color={colors.textPrimary} />}
          title="Cylinder Status"
          actionLabel="View All"
          onActionPress={() => router.navigate('/cylinders/stock')}
        />
        <View style={styles.statsRow}>
          <StatTile label="Filled" value={loading ? '—' : data?.filled ?? 0} valueColor={colors.success} />
          <StatTile label="Empty" value={loading ? '—' : data?.empty ?? 0} valueColor={colors.danger} bordered />
          {/* The only number on this screen that used to lead nowhere. */}
          <StatTile
            label="Outstanding"
            value={loading ? '—' : data?.outstanding ?? 0}
            valueColor={colors.primary}
            bordered
            onPress={() => router.navigate('/cylinders/outstanding')}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          icon={<Icon name="wallet" width={22} height={16} color={colors.textPrimary} />}
          title="Expense MTD"
          actionLabel="View All"
          onActionPress={() => router.navigate('/expenses')}
        />
        <View>
          <Text style={styles.bigStat}>{loading ? '—' : formatCurrency(data?.expenseMtd ?? 0)}</Text>
        </View>
      </Card>

      {isOwner ? (
        <Card>
          <SectionHeader
            icon={<Icon name="people" width={22} height={16} color={colors.textPrimary} />}
            title="Payroll Summary"
          />
          <View>
            <Text style={styles.bigStat}>{loading ? '—' : formatCurrency(data?.payrollMonthlyTotal ?? 0)}</Text>
          </View>
          <View style={styles.payrollAction}>
            <PrimaryButton label="Manage Payroll" onPress={() => router.navigate('/more/payroll')} />
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionHeader icon={<Icon name="bolt" width={16} height={20} color={colors.textPrimary} />} title="Quick Actions" />
        <View style={styles.actionsGrid}>
          <QuickActionButton
            icon="plus-circle"
            label="New Transaction"
            onPress={() => router.push('/new-transaction')}
          />
          <QuickActionButton
            icon="clipboard-list"
            label="Add Expense"
            onPress={() => router.push('/new-expense')}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          icon={<Icon name="refresh" width={18} height={18} color={colors.textPrimary} />}
          title="Recent Activity"
        />
        <View>
          {items.length === 0 ? (
            <Text style={styles.activityEmpty}>Nothing recorded yet.</Text>
          ) : (
            items.map((item, index) => (
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
            ))
          )}
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
  activityEmpty: {
    ...typography.body,
    color: colors.textSecondary,
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
    borderRadius: radius.sm,
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
