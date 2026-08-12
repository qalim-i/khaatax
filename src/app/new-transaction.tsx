import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ErrorBanner } from '@/components/ui/error-banner';
import { SelectField } from '@/components/ui/select-field';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useCreateTransaction } from '@/hooks/use-create-transaction';
import { notify } from '@/lib/dialog';
import { parseQuantity } from '@/lib/quantity';
import { useParties } from '@/hooks/use-parties';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function NewTransactionScreen() {
  const { parties, loading: partiesLoading, error: partiesError, refresh: refreshParties } = useParties();
  const { submit, submitting } = useCreateTransaction();

  // A party added on the Party Ledger screen must be selectable here on return.
  useRefreshOnFocus(refreshParties);

  const [partyId, setPartyId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cylinderType, setCylinderType] = useState('');
  const [filledSent, setFilledSent] = useState('0');
  const [emptyReceived, setEmptyReceived] = useState('0');

  const filledQty = parseQuantity(filledSent);
  const emptyQty = parseQuantity(emptyReceived);
  const quantitiesAreNumbers = filledQty !== null && emptyQty !== null;
  const movesAtLeastOne = quantitiesAreNumbers && filledQty + emptyQty > 0;

  const quantityError = !quantitiesAreNumbers
    ? 'Quantities must be whole numbers, zero or more.'
    : !movesAtLeastOne
      ? 'A transaction has to move at least one cylinder.'
      : null;

  const canSubmit =
    !!partyId && cylinderType.trim().length > 0 && movesAtLeastOne && !submitting;

  async function handleSubmit() {
    // Re-checked rather than trusted from `canSubmit`: the button is only one way
    // in, and the values are read again here.
    if (!partyId || filledQty === null || emptyQty === null || filledQty + emptyQty === 0) return;

    const { transaction, error: failure } = await submit({
      party_id: partyId,
      date: isoDate(date),
      cylinder_type: cylinderType.trim(),
      filled_sent: filledQty,
      empty_received: emptyQty,
    });
    if (transaction) {
      notify('Transaction Recorded', `Invoice #${transaction.invoice_no} · DC #${transaction.dc_no}`);
      router.back();
    } else {
      notify('Failed to save transaction', failure ?? 'The transaction could not be saved.');
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>New Transaction</Text>
          <Text style={styles.subtitle}>Record cylinder exchanges and billing.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.identifiersRow}>
            <View style={styles.identifier}>
              <Text style={styles.identifierLabel}>Invoice No.</Text>
              <Text style={styles.identifierValue}>Assigned on submit</Text>
            </View>
            <View style={styles.identifier}>
              <Text style={styles.identifierLabel}>DC No.</Text>
              <Text style={styles.identifierValue}>Assigned on submit</Text>
            </View>
          </View>

          {partiesError ? <ErrorBanner message={partiesError} /> : null}

          <SelectField
            label="Party"
            placeholder={partiesLoading ? 'Loading parties...' : 'Select Party...'}
            value={partyId}
            onChange={setPartyId}
            options={parties.map((p) => ({ value: p.id, label: p.name }))}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <Pressable style={styles.dateControl} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>{formatDate(date)}</Text>
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

          <View style={styles.cylinderSection}>
            <Text style={styles.sectionLabel}>Cylinder Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Cylinder Type</Text>
              <TextInput
                style={styles.textInput}
                value={cylinderType}
                onChangeText={setCylinderType}
                placeholder="e.g. Oxygen 40L"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Filled Sent</Text>
              <TextInput
                style={styles.numberInput}
                value={filledSent}
                onChangeText={setFilledSent}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Empty Received</Text>
              <TextInput
                style={styles.numberInput}
                value={emptyReceived}
                onChangeText={setEmptyReceived}
                keyboardType="number-pad"
              />
            </View>

            <ErrorBanner message={quantityError} />
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}>
              <Text style={styles.submitLabel} numberOfLines={1}>
                {submitting ? 'Saving...' : 'Submit Transaction'}
              </Text>
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
  identifiersRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.sm + 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  identifier: {
    flex: 1,
    gap: 4,
  },
  identifierLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  identifierValue: {
    ...typography.bodyLarge,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  field: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
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
  cylinderSection: {
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.lg,
  },
  sectionLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  textInput: {
    height: 40,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#8D8D8D',
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  numberInput: {
    height: 40,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#6B7280',
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },
  /*
    Both buttons used to size to their own text with fixed horizontal padding, so
    "Submit Transaction" pushed the row past the card edge on narrow screens.
    Cancel now keeps its intrinsic width but may shrink; Submit takes the rest.
  */
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  cancelButton: {
    flexShrink: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    height: 48,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  submitButton: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 48,
    paddingHorizontal: spacing.md,
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
