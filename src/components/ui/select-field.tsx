import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  placeholder: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export function SelectField({ label, placeholder, value, options, onChange }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.control} onPress={() => setOpen(true)}>
        <Text style={[styles.controlText, !selected && styles.placeholderText]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon name="chevron-down" width={12} height={7} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}>
                  <Text style={styles.optionLabel}>{item.label}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.emptyLabel}>No options available.</Text>}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  control: {
    height: 40,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#8D8D8D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  controlText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textPrimary,
  },
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
    maxHeight: '70%',
    gap: spacing.sm,
  },
  sheetTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  emptyLabel: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
});
