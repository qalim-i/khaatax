import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import type { DocumentKind } from '@/lib/pdf/documents';
import type { Transaction } from '@/types/db';

interface ExportDocumentSheetProps {
  /** The transaction to export, or null when the sheet is closed. */
  transaction: Transaction | null;
  exporting: boolean;
  error: string | null;
  onExport: (kind: DocumentKind) => void;
  onClose: () => void;
}

/**
 * Invoice and Delivery Challan are offered separately because they are separate
 * documents with numbers from independent sequences (TRD Section 4) — the user
 * picks the one they actually need to send.
 */
export function ExportDocumentSheet({
  transaction,
  exporting,
  error,
  onExport,
  onClose,
}: ExportDocumentSheetProps) {
  return (
    <Modal
      visible={!!transaction}
      animationType="slide"
      transparent
      onRequestClose={exporting ? undefined : onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Generate Document</Text>
          {transaction ? (
            <Text style={styles.subtitle}>
              {transaction.cylinder_type} · {transaction.filled_sent} sent ·{' '}
              {transaction.empty_received} received
            </Text>
          ) : null}

          <Pressable
            style={[styles.option, exporting && styles.optionDisabled]}
            onPress={() => onExport('invoice')}
            disabled={exporting}>
            <Text style={styles.optionTitle}>Invoice</Text>
            <Text style={styles.optionMeta}>INV-{transaction?.invoice_no}</Text>
          </Pressable>

          <Pressable
            style={[styles.option, exporting && styles.optionDisabled]}
            onPress={() => onExport('challan')}
            disabled={exporting}>
            <Text style={styles.optionTitle}>Delivery Challan</Text>
            <Text style={styles.optionMeta}>DC-{transaction?.dc_no}</Text>
          </Pressable>

          {exporting ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.busyLabel}>Generating PDF...</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose} disabled={exporting}>
              <Text style={[styles.cancelLabel, exporting && styles.optionDisabled]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionMeta: {
    ...typography.body,
    color: colors.textSecondary,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  busyLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  cancelButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  cancelLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
