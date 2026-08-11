import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { Icon, type IconName } from '@/components/ui/icon';

interface QuickActionButtonProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
}

export function QuickActionButton({ icon, label, onPress }: QuickActionButtonProps) {
  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Icon name={icon} width={20} height={20} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 1,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  iconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
