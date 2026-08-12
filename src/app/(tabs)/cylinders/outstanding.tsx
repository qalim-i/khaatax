import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { OutstandingRow } from '@/components/outstanding/outstanding-row';
import { SelectField } from '@/components/ui/select-field';
import { SegmentedControl, type Segment } from '@/components/ui/segmented-control';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useOutstanding } from '@/hooks/use-outstanding';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { toIsoDate } from '@/lib/date';
import { formatDisplayDate } from '@/lib/format';

const ALL = '__all__';

type AgingBand = 'any' | '30' | '60';

const AGING_BANDS: readonly Segment<AgingBand>[] = [
  { value: 'any', label: 'All' },
  { value: '30', label: '30+ days' },
  { value: '60', label: '60+ days' },
];

export default function OutstandingReportScreen() {
  const {
    rows,
    totals,
    parties,
    cylinderTypes,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    loading,
    error,
    refresh,
  } = useOutstanding();

  useRefreshOnFocus(refresh);

  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  const band: AgingBand =
    filters.minOverdueDays === 60 ? '60' : filters.minOverdueDays === 30 ? '30' : 'any';

  return (
    <View style={styles.container}>
      <TopAppBar
        title="KhaataX"
        leftIcon="chevron-right"
        leftIconRotation={180}
        onLeftPress={() => router.back()}
        rightIcon="account"
        onRightPress={() => router.push('/profile')}
      />
      <FlatList
        data={rows}
        keyExtractor={(item) => `${item.partyId}-${item.cylinderType}`}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.headerBlock}>
              <Text style={styles.h1}>Outstanding Report</Text>
              <Text style={styles.subtitle}>
                Cylinders still with customers, oldest first. Ages are measured from the earliest
                delivery not yet matched by a return.
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>CYLINDERS OUT</Text>
                <Text style={[styles.summaryValue, { color: colors.danger }]}>
                  {loading ? '—' : totals.cylinders}
                </Text>
              </View>
              <View style={[styles.summaryTile, styles.summaryTileBordered]}>
                <Text style={styles.summaryLabel}>PARTIES</Text>
                <Text style={styles.summaryValue}>{loading ? '—' : totals.parties}</Text>
              </View>
              <View style={[styles.summaryTile, styles.summaryTileBordered]}>
                <Text style={styles.summaryLabel}>OLDEST</Text>
                <Text style={styles.summaryValue}>{loading ? '—' : `${totals.maxOverdueDays}d`}</Text>
              </View>
            </View>

            <View style={styles.filterCard}>
              <SelectField
                label="Customer"
                placeholder="All parties"
                value={filters.partyId}
                onChange={(value) => setFilter('partyId', value === ALL ? null : value)}
                options={[
                  { value: ALL, label: 'All parties' },
                  ...parties.map((party) => ({ value: party.id, label: party.name })),
                ]}
              />

              <SelectField
                label="Cylinder Type"
                placeholder="All types"
                value={filters.cylinderType}
                onChange={(value) => setFilter('cylinderType', value === ALL ? null : value)}
                options={[
                  { value: ALL, label: 'All types' },
                  ...cylinderTypes.map((type) => ({ value: type, label: type })),
                ]}
              />

              <View style={styles.field}>
                <Text style={styles.label}>Overdue</Text>
                <SegmentedControl
                  segments={AGING_BANDS}
                  value={band}
                  onChange={(value) =>
                    setFilter('minOverdueDays', value === 'any' ? null : Number(value))
                  }
                />
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.label}>Transactions From</Text>
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
                  <Text style={styles.clearLabel}>
                    Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <OutstandingRow row={item} onPress={() => router.push(`/cylinders/parties/${item.partyId}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyState}>Nothing outstanding for these filters.</Text>
          ) : null
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
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md - 1,
  },
  summaryTile: {
    flex: 1,
    gap: 4,
  },
  summaryTileBordered: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.sm,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.statValue,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  filterCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.md,
  },
  field: {
    gap: 4,
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
