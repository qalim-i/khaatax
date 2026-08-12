import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ExportDocumentSheet } from '@/components/party/export-document-sheet';
import { TransactionRow } from '@/components/party/transaction-row';
import { ErrorBanner } from '@/components/ui/error-banner';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useExportPdf } from '@/hooks/use-export-pdf';
import { usePartyDetail } from '@/hooks/use-party-detail';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { formatCurrency } from '@/lib/format';
import type { DocumentKind } from '@/lib/pdf/documents';
import type { Transaction } from '@/types/db';

export default function PartyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { party, transactions, loading, error, refresh } = usePartyDetail(id);
  const { exportDocument, exporting } = useExportPdf();

  const [exportTarget, setExportTarget] = useState<Transaction | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useRefreshOnFocus(refresh);

  const isSettled = (party?.balance ?? 0) === 0;
  // The export header should always target the most recently created transaction,
  // even if the list remains ordered by date for history display.
  const latestTransaction = transactions.reduce<Transaction | null>((latest, tx) => {
    if (!latest) return tx;
    return new Date(tx.created_at).getTime() > new Date(latest.created_at).getTime() ? tx : latest;
  }, null);

  function openExport(tx: Transaction) {
    setExportError(null);
    setExportTarget(tx);
  }

  async function handleExport(kind: DocumentKind) {
    if (!party || !exportTarget) return;
    const failure = await exportDocument(kind, party, exportTarget);
    // Keep the sheet open on failure — the message belongs where the user is.
    if (failure) setExportError(failure);
    else setExportTarget(null);
  }

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
                      ? `${formatCurrency(party.security_deposit)} held`
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

              <ErrorBanner message={error} />

              <Pressable
                style={[styles.generateButton, !latestTransaction && styles.generateDisabled]}
                onPress={() => latestTransaction && openExport(latestTransaction)}
                disabled={!latestTransaction}>
                <Text style={styles.generateLabel}>
                  {latestTransaction
                    ? `Generate Invoice & DC · INV-${latestTransaction.invoice_no}`
                    : 'Generate Invoice & DC'}
                </Text>
              </Pressable>
              {!latestTransaction ? (
                <Text style={styles.generateHint}>
                  Record a transaction first — invoice and DC numbers are assigned on save.
                </Text>
              ) : null}

              <Text style={styles.sectionLabel}>Transaction History</Text>
            </View>
          }
          renderItem={({ item }) => <TransactionRow tx={item} onPress={() => openExport(item)} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={<Text style={styles.emptyState}>No transactions recorded for this party yet.</Text>}
        />
      )}
      <ExportDocumentSheet
        transaction={exportTarget}
        exporting={exporting}
        error={exportError}
        onExport={handleExport}
        onClose={() => setExportTarget(null)}
      />
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
  generateDisabled: {
    opacity: 0.5,
  },
  generateLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.white,
  },
  generateHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
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
