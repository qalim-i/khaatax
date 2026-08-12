import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PartyFormModal } from '@/components/party/party-form-modal';
import { PartyRow } from '@/components/party/party-row';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Icon } from '@/components/ui/icon';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useCreateParty } from '@/hooks/use-create-party';
import { usePartyLedger } from '@/hooks/use-party-ledger';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import type { PartyInput } from '@/types/db';

export default function PartyLedgerScreen() {
  const { rows, totals, loading, error, query, setQuery, refresh } = usePartyLedger();
  const { create } = useCreateParty();
  const [formVisible, setFormVisible] = useState(false);

  useRefreshOnFocus(refresh);

  async function handleCreate(input: PartyInput) {
    const failure = await create(input);
    if (!failure) await refresh();
    return failure;
  }

  return (
    <View style={styles.container}>
      <TopAppBar title="KhaataX" leftIcon="chevron-right" leftIconRotation={180} onLeftPress={() => router.back()} rightIcon="account" />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.party.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.headerBlock}>
              <Text style={styles.h1}>Party Ledger</Text>
              <Text style={styles.subtitle}>Manage cylinder transactions across customers</Text>
            </View>

            <View style={styles.searchWrap}>
              <Icon name="search" width={18} height={18} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search party name..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Pressable style={styles.addButton} onPress={() => setFormVisible(true)}>
              <Icon name="plus" width={14} height={14} color={colors.white} />
              <Text style={styles.addLabel}>Add Party</Text>
            </Pressable>

            <ErrorBanner message={error} />

            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>TOTAL FILLED SENT (MTD)</Text>
                <View style={styles.summaryValueRow}>
                  <Icon name="package" width={18} height={15} color={colors.primary} />
                  <Text style={styles.summaryValue}>{totals.filledSentMtd.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>TOTAL EMPTY RCVD (MTD)</Text>
                <View style={styles.summaryValueRow}>
                  <Icon name="refresh" width={13} height={13} color={colors.success} />
                  <Text style={styles.summaryValue}>{totals.emptyReceivedMtd.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>NET BALANCE (OUTSTANDING)</Text>
                <View style={styles.summaryValueRow}>
                  <Icon name="warning-triangle" width={18} height={16} color={colors.danger} />
                  <Text style={styles.summaryValue}>{totals.netBalance.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {loading ? <ActivityIndicator style={styles.loading} color={colors.primary} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <PartyRow row={item} onPress={() => router.push(`/cylinders/parties/${item.party.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyState}>
              {query.trim()
                ? 'No parties match that search.'
                : 'No parties yet. Tap "Add Party" to create your first customer.'}
            </Text>
          ) : null
        }
      />
      <PartyFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleCreate}
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
    gap: spacing.sm,
  },
  headerArea: {
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  headerBlock: {
    gap: 4,
  },
  h1: {
    ...typography.h2,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  searchWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm,
    zIndex: 1,
  },
  searchInput: {
    height: 40,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#6B7280',
    paddingLeft: 40,
    paddingRight: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
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
  summaryCards: {
    gap: spacing.sm,
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
    textTransform: 'uppercase',
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryValue: {
    ...typography.statValue,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loading: {
    marginTop: spacing.sm,
  },
  emptyState: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
