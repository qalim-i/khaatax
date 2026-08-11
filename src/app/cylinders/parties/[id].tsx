import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { TopAppBar } from '@/components/ui/top-app-bar';
import { TransactionRow } from '@/components/party/transaction-row';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { usePartyDetail } from '@/hooks/use-party-detail';

export default function PartyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { party, transactions, loading } = usePartyDetail(id);

  const isSettled = (party?.balance ?? 0) === 0;

  return (
    <View style={styles.container}>
      <TopAppBar
        title={party?.name ?? 'Party Detail'}
        leftIcon="chevron-right"
        leftIconRotation={180}
        onLeftPress={() => router.back()}
      />
      {loading && !party ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.headerArea}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryTopRow}>
                  <Text style={styles.balanceLabel}>Current Balance</Text>
                  <View style={[styles.chip, isSettled ? styles.chipSettled : styles.chipPending]}>
                    <Text style={[styles.chipLabel, isSettled ? styles.chipLabelSettled : styles.chipLabelPending]}>
                      {isSettled ? 'Settled' : 'Outstanding'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.balanceValue, { color: isSettled ? colors.success : colors.danger }]}>
                  {party?.balance ?? 0}
                </Text>
                <View style={styles.depositRow}>
                  <Text style={styles.depositLabel}>Security Deposit</Text>
                  <Text style={styles.depositValue}>
                    {party && party.security_deposit > 0
                      ? `$${party.security_deposit.toLocaleString()} held`
                      : 'None on file'}
                  </Text>
                </View>
                {party?.contact ? (
                  <View style={styles.depositRow}>
                    <Text style={styles.depositLabel}>Contact</Text>
                    <Text style={styles.depositValue}>{party.contact}</Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                style={styles.generateButton}
                onPress={() => Alert.alert('Generate Invoice & DC', 'PDF export lands in Phase 4.')}>
                <Text style={styles.generateLabel}>Generate Invoice & DC</Text>
              </Pressable>

              <Text style={styles.sectionLabel}>Transaction History</Text>
            </View>
          }
          renderItem={({ item }) => <TransactionRow tx={item} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={<Text style={styles.emptyState}>No transactions recorded for this party yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerArea: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  balanceValue: {
    ...typography.statValueLarge,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
  },
  chipPending: {
    backgroundColor: '#FFF1F1',
  },
  chipSettled: {
    backgroundColor: '#A7F0BA',
  },
  chipLabel: {
    ...typography.caption,
    fontWeight: '500',
  },
  chipLabelPending: {
    color: '#750E13',
  },
  chipLabelSettled: {
    color: '#044317',
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  depositLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  depositValue: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  generateLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.white,
  },
  sectionLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  emptyState: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
