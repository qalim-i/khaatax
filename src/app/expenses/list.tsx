import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ExpenseRow } from '@/components/expense/expense-row';
import { SelectField } from '@/components/ui/select-field';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useAppUsers } from '@/hooks/use-app-users';
import { useExpenses } from '@/hooks/use-expenses';
import { toIsoDate } from '@/lib/date';
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories';
import { formatCurrency, formatDisplayDate } from '@/lib/format';

const ALL = '__all__';

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function ExpenseListScreen() {
  const params = useLocalSearchParams<{ category?: string; from?: string; to?: string }>();
  const { nameFor, users } = useAppUsers();
  const { expenses, total, filters, setFilter, clearFilters, activeFilterCount, loading, error } =
    useExpenses({
      category: firstParam(params.category),
      from: firstParam(params.from),
      to: firstParam(params.to),
    });

  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  return (
    <View style={styles.container}>
      <TopAppBar
        title="KhaataX"
        leftIcon="chevron-right"
        leftIconRotation={180}
        onLeftPress={() => router.back()}
        rightIcon="account"
      />
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.headerBlock}>
              <Text style={styles.h1}>Expense History</Text>
              <Text style={styles.subtitle}>Filter by category, date range, or who logged it.</Text>
            </View>

            <View style={styles.filterCard}>
              <SelectField
                label="Category"
                placeholder="All categories"
                value={filters.category}
                onChange={(value) => setFilter('category', value === ALL ? null : value)}
                options={[
                  { value: ALL, label: 'All categories' },
                  ...EXPENSE_CATEGORIES.map((name) => ({ value: name, label: name })),
                ]}
              />

              <SelectField
                label="Logged By"
                placeholder="Anyone"
                value={filters.createdBy}
                onChange={(value) => setFilter('createdBy', value === ALL ? null : value)}
                options={[
                  { value: ALL, label: 'Anyone' },
                  ...users.map((user) => ({ value: user.id, label: user.name })),
                ]}
              />

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.label}>From</Text>
                  <Pressable style={styles.dateControl} onPress={() => setPicking('from')}>
                    <Text style={[styles.dateText, !filters.from && styles.datePlaceholder]}>
                      {filters.from ? formatDisplayDate(filters.from) : 'Any date'}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.label}>To</Text>
                  <Pressable style={styles.dateControl} onPress={() => setPicking('to')}>
                    <Text style={[styles.dateText, !filters.to && styles.datePlaceholder]}>
                      {filters.to ? formatDisplayDate(filters.to) : 'Any date'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {picking ? (
                <DateTimePicker
                  value={
                    (picking === 'from' ? filters.from : filters.to)
                      ? new Date(`${picking === 'from' ? filters.from : filters.to}T00:00:00`)
                      : new Date()
                  }
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event, selected) => {
                    const field = picking;
                    setPicking(Platform.OS === 'ios' ? picking : null);
                    if (event.type === 'dismissed' || !selected || !field) return;
                    setFilter(field, toIsoDate(selected));
                    if (Platform.OS === 'ios') setPicking(null);
                  }}
                />
              ) : null}

              {activeFilterCount > 0 ? (
                <Pressable style={styles.clearButton} onPress={clearFilters}>
                  <Text style={styles.clearLabel}>Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>
                {expenses.length} {expenses.length === 1 ? 'ENTRY' : 'ENTRIES'}
              </Text>
              <Text style={styles.totalValue}>{loading ? '—' : formatCurrency(total)}</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
        }
        renderItem={({ item }) => <ExpenseRow expense={item} loggedBy={nameFor(item.created_by)} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyState}>No expenses match these filters.</Text> : null
        }
      />
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
  filterCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateField: {
    flex: 1,
    gap: 4,
  },
  dateControl: {
    height: 40,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#8D8D8D',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  dateText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  datePlaceholder: {
    color: colors.textSecondary,
  },
  clearButton: {
    alignSelf: 'flex-start',
  },
  clearLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.primary,
  },
  totalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md - 1,
    gap: spacing.xs,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  totalValue: {
    ...typography.statValue,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  error: {
    ...typography.body,
    color: colors.danger,
  },
  emptyState: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
