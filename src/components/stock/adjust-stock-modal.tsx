import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ErrorBanner } from '@/components/ui/error-banner';
import { PrimaryButton } from '@/components/ui/primary-button';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { parseQuantity } from '@/lib/quantity';
import type { StockStatus } from '@/types/db';

const STATUS_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'filled', label: 'Filled' },
  { value: 'empty', label: 'Empty' },
  { value: 'at_customer', label: 'At Customer' },
  { value: 'under_refill', label: 'Under Refill' },
  { value: 'damaged', label: 'Damaged / Maint.' },
];

interface AdjustStockModalProps {
  visible: boolean;
  onClose: () => void;
  /** Returns a failure message, or null on success. */
  onSubmit: (status: StockStatus, delta: number) => Promise<string | null>;
}

export function AdjustStockModal({ visible, onClose, onSubmit }: AdjustStockModalProps) {
  const [status, setStatus] = useState<StockStatus>('filled');
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // The failure used to land in useStock's error state, which renders on the
  // Stock screen *behind* this modal — so a rejected adjustment looked like a
  // button that did nothing. The message belongs where the user is.
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    // `parseInt` here accepted "12abc" as 12 and leaned on `!qty` to catch the
    // rest; `parseQuantity` is the same guard the transaction form uses.
    const qty = parseQuantity(amount);
    if (qty === null || qty <= 0) {
      setError('Quantity must be a whole number greater than zero.');
      return;
    }

    setSubmitting(true);
    const failure = await onSubmit(status, direction === 'add' ? qty : -qty);
    setSubmitting(false);

    if (failure) {
      setError(failure);
      return;
    }

    setError(null);
    setAmount('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Receive / Adjust Stock</Text>

          <Text style={styles.label}>Status</Text>
          <View style={styles.chipsRow}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setStatus(opt.value)}
                style={[styles.chip, status === opt.value && styles.chipActive]}>
                <Text style={[styles.chipLabel, status === opt.value && styles.chipLabelActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Direction</Text>
          <View style={styles.chipsRow}>
            <Pressable
              onPress={() => setDirection('add')}
              style={[styles.chip, direction === 'add' && styles.chipActive]}>
              <Text style={[styles.chipLabel, direction === 'add' && styles.chipLabelActive]}>Add</Text>
            </Pressable>
            <Pressable
              onPress={() => setDirection('remove')}
              style={[styles.chip, direction === 'remove' && styles.chipActive]}>
              <Text style={[styles.chipLabel, direction === 'remove' && styles.chipLabelActive]}>Remove</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
          />

          <ErrorBanner message={error} />

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Confirm" onPress={handleSubmit} disabled={submitting || !amount} />
            </View>
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
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xxs + 2,
    paddingHorizontal: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipLabelActive: {
    color: colors.white,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: 16,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    alignItems: 'center',
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
