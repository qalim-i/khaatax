import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryBreakdown } from '@/components/expense/category-breakdown';
import { MonthlyTrendChart } from '@/components/expense/monthly-trend-chart';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl, type Segment } from '@/components/ui/segmented-control';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useExpenseDashboard, type ExpensePeriod } from '@/hooks/use-expense-dashboard';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { formatCurrency } from '@/lib/format';

const PERIODS: readonly Segment<ExpensePeriod>[] = [
  { value: 'today', label: 'Today' },
  { value: 'mtd', label: 'This Month' },
  { value: 'ytd', label: 'This Year' },
];

const PERIOD_CAPTION: Record<ExpensePeriod, string> = {
  today: 'Spend today',
  mtd: 'Spend this month',
  ytd: 'Spend this year',
};

export default function ExpenseDashboardScreen() {
  const { totals, byCategory, trend, period, setPeriod, periodStart, loading, error, refresh } =
    useExpenseDashboard();

  useRefreshOnFocus(refresh);

  const periodTotal = totals[period];

  function openList(category?: string) {
    router.push({
      pathname: '/expenses/list',
      params: {
        ...(category ? { category } : {}),
        from: periodStart,
      },
    });
  }

  return (
    <View style={styles.container}>
      <TopAppBar title="KhaataX" rightIcon="account" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}>
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>Expenses</Text>
          <Text style={styles.subtitle}>Track where the company&apos;s money is going.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <SegmentedControl segments={PERIODS} value={period} onChange={setPeriod} />

        <Card>
          <View style={styles.headlineBlock}>
            <Text style={styles.headlineLabel}>{PERIOD_CAPTION[period].toUpperCase()}</Text>
            <Text style={styles.headlineValue}>
              {loading ? '—' : formatCurrency(periodTotal)}
            </Text>
          </View>

          <View style={styles.miniStatsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>TODAY</Text>
              <Text style={styles.miniValue}>{loading ? '—' : formatCurrency(totals.today)}</Text>
            </View>
            <View style={[styles.miniStat, styles.miniStatBordered]}>
              <Text style={styles.miniLabel}>MTD</Text>
              <Text style={styles.miniValue}>{loading ? '—' : formatCurrency(totals.mtd)}</Text>
            </View>
            <View style={[styles.miniStat, styles.miniStatBordered]}>
              <Text style={styles.miniLabel}>YTD</Text>
              <Text style={styles.miniValue}>{loading ? '—' : formatCurrency(totals.ytd)}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.addButton} onPress={() => router.push('/expenses/new')}>
              <Icon name="plus" width={14} height={14} color={colors.white} />
              <Text style={styles.addLabel}>Add Expense</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => openList()}>
              <Text style={styles.secondaryLabel}>View All</Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <SectionHeader
            icon={<Icon name="wallet" width={22} height={16} color={colors.textPrimary} />}
            title="By Category"
          />
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <CategoryBreakdown data={byCategory} onSelect={(category) => openList(category)} />
              {byCategory.length > 0 ? (
                <Text style={styles.hint}>Tap a category to see the entries behind it.</Text>
              ) : null}
            </>
          )}
        </Card>

        <Card>
          <SectionHeader
            icon={<Icon name="trend-arrow" width={18} height={16} color={colors.textPrimary} />}
            title="Monthly Trend"
          />
          {loading ? <ActivityIndicator color={colors.primary} /> : <MonthlyTrendChart data={trend} />}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headlineBlock: {
    gap: 4,
  },
  headlineLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  headlineValue: {
    ...typography.statValueLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  miniStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  miniStat: {
    flex: 1,
    gap: 2,
  },
  miniStatBordered: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.sm,
  },
  miniLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  miniValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  addLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
