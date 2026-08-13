import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import type { PartyInput } from '@/types/db';

interface PartyFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Resolves to a failure message, or null when the party was created. */
  onSubmit: (input: PartyInput) => Promise<string | null>;
}

export function PartyFormModal({ visible, onClose, onSubmit }: PartyFormModalProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [deposit, setDeposit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Add-only sheet, so opening it always starts from blank rather than showing
  // whatever the last attempt left behind.
  useEffect(() => {
    if (!visible) return;
    // Resetting on open, rather than keying the component from the parent, is a
    // deliberate trade: a `key` change would remount the sheet on close too and
    // cut the slide-out animation short. The effect is scoped to the open
    // transition and touches only this component's own fields.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName('');
    setContact('');
    setDeposit('');
    setSubmitError(null);
  }, [visible]);

  // A blank deposit means "none", which is the column default of 0. Anything
  // typed has to be a real, non-negative number.
  const parsedDeposit = deposit.trim().length > 0 ? Number(deposit) : 0;
  const depositIsValid = Number.isFinite(parsedDeposit) && parsedDeposit >= 0;
  const canSubmit = name.trim().length > 0 && depositIsValid && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    const failure = await onSubmit({
      name: name.trim(),
      contact: contact.trim() ? contact.trim() : null,
      security_deposit: parsedDeposit,
    });
    setSubmitting(false);
    // Stay open on failure — a banner on the screen underneath would sit behind
    // this sheet's backdrop and never be read.
    if (failure) setSubmitError(failure);
    else onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add Party</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sharma Gases"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Contact (optional)</Text>
          <TextInput
            style={styles.input}
            value={contact}
            onChangeText={setContact}
            keyboardType="phone-pad"
            placeholder="e.g. 98765 43210"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Security Deposit</Text>
          <View style={styles.payRow}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.payInput}
              value={deposit}
              onChangeText={setDeposit}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          {deposit.length > 0 && !depositIsValid ? (
            <Text style={styles.fieldError}>Enter a deposit of zero or more.</Text>
          ) : null}

          {submitError ? <Text style={styles.fieldError}>{submitError}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}>
              <Text style={styles.submitLabel}>{submitting ? 'Saving...' : 'Add Party'}</Text>
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: 16,
    color: colors.textPrimary,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  currencyPrefix: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  payInput: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    fontSize: 16,
    color: colors.textPrimary,
  },
  fieldError: {
    ...typography.caption,
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
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
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 44,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
});
