import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SelectField } from '@/components/ui/select-field';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useCreateExpense } from '@/hooks/use-create-expense';
import { toIsoDate } from '@/lib/date';
import { notify } from '@/lib/dialog';
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories';
import { formatCurrency, formatDisplayDate } from '@/lib/format';
import type { ExpenseCategory } from '@/types/db';

export default function AddExpenseScreen() {
  const { submit, submitting } = useCreateExpense();

  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // `amount > 0` is a check constraint on the table — mirror it here so the user
  // gets a disabled button rather than a database error.
  const parsedAmount = Number(amount);
  const amountIsValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSubmit = !!category && amountIsValid && !submitting;

  async function handleSubmit() {
    if (!category || !amountIsValid) return;

    const { expense, error: failure } = await submit({
      date: toIsoDate(date),
      amount: parsedAmount,
      category: category as ExpenseCategory,
      note: note.trim() ? note.trim() : null,
    });

    if (expense) {
      // Navigate unconditionally rather than from a dialog callback — the row is
      // already written, so the screen must not depend on the dialog to leave.
      notify('Expense Logged', `${expense.category} · ${formatCurrency(expense.amount)}`);
      router.back();
    } else {
      notify('Failed to log expense', failure ?? 'The expense could not be saved.');
    }
  }

  return (
    <View style={styles.container}>
      <TopAppBar
        title="KhaataX"
        leftIcon="chevron-right"
        leftIconRotation={180}
        onLeftPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>Add Expense</Text>
          <Text style={styles.subtitle}>Logged immediately — no approval needed.</Text>
        </View>

        <View style={styles.card}>
          <SelectField
            label="Category"
            placeholder="Select Category..."
            value={category}
            onChange={setCategory}
            options={EXPENSE_CATEGORIES.map((name) => ({ value: name, label: name }))}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            {amount.length > 0 && !amountIsValid ? (
              <Text style={styles.fieldError}>Enter an amount greater than zero.</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <Pressable style={styles.dateControl} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>{formatDisplayDate(toIsoDate(date))}</Text>
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_event, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) setDate(selected);
                }}
              />
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Diesel for delivery van"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}>
              <Text style={styles.submitLabel}>{submitting ? 'Saving...' : 'Log Expense'}</Text>
            </Pressable>
          </View>
        </View>
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
  card: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg + 1,
    gap: spacing.lg,
  },
  field: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fieldError: {
    ...typography.caption,
    color: colors.danger,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#8D8D8D',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  currencyPrefix: {
    ...typography.statValue,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    height: '100%',
    ...typography.statValue,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dateControl: {
    height: 40,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#6B7280',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  dateText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  noteInput: {
    minHeight: 72,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#8D8D8D',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    height: 48,
    paddingHorizontal: spacing.lg - 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 48,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
});
