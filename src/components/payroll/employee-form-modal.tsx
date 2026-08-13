import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import type { Employee, EmployeeInput } from '@/types/db';

interface EmployeeFormModalProps {
  visible: boolean;
  /** The employee being edited, or null when adding a new one. */
  employee: Employee | null;
  onClose: () => void;
  onSubmit: (input: EmployeeInput) => Promise<boolean>;
}

export function EmployeeFormModal({ visible, employee, onClose, onSubmit }: EmployeeFormModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [pay, setPay] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reload the fields whenever the sheet opens onto a different employee,
  // otherwise the previous subject's values linger in the inputs.
  useEffect(() => {
    if (!visible) return;
    // Resetting on open, rather than keying the component from the parent, is a
    // deliberate trade: a `key` change would remount the sheet on close too and
    // cut the slide-out animation short. The effect is scoped to the open
    // transition and touches only this component's own fields.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(employee?.name ?? '');
    setRole(employee?.role ?? '');
    setPay(employee ? String(employee.monthly_pay) : '');
  }, [visible, employee]);

  // `monthly_pay >= 0` is a check constraint on the table — mirror it here so an
  // invalid entry disables the button instead of failing at the database.
  const parsedPay = Number(pay);
  const payIsValid = pay.trim().length > 0 && Number.isFinite(parsedPay) && parsedPay >= 0;
  const canSubmit = name.trim().length > 0 && payIsValid && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit({
      name: name.trim(),
      role: role.trim() ? role.trim() : null,
      monthly_pay: parsedPay,
    });
    setSubmitting(false);
    if (ok) onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{employee ? 'Edit Employee' : 'Add Employee'}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ramesh Kumar"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Role (optional)</Text>
          <TextInput
            style={styles.input}
            value={role}
            onChangeText={setRole}
            placeholder="e.g. Driver"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Monthly Pay</Text>
          <View style={styles.payRow}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.payInput}
              value={pay}
              onChangeText={setPay}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          {pay.length > 0 && !payIsValid ? (
            <Text style={styles.fieldError}>Enter a pay amount of zero or more.</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}>
              <Text style={styles.submitLabel}>
                {submitting ? 'Saving...' : employee ? 'Save Changes' : 'Add Employee'}
              </Text>
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
