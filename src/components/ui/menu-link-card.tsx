import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { Icon, type IconName } from '@/components/ui/icon';

interface MenuLinkCardProps {
  icon: IconName;
  iconSize: { width: number; height: number };
  title: string;
  description: string;
  onPress: () => void;
  highlighted?: boolean;
}

export function MenuLinkCard({ icon, iconSize, title, description, onPress, highlighted }: MenuLinkCardProps) {
  const iconColor = highlighted ? colors.white : colors.primary;
  const textColor = highlighted ? colors.white : colors.textPrimary;
  const descColor = highlighted ? 'rgba(255,255,255,0.9)' : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        highlighted ? styles.highlighted : styles.neutral,
        pressed && styles.pressed,
      ]}>
      <View style={styles.topRow}>
        <Icon name={icon} width={iconSize.width} height={iconSize.height} color={iconColor} />
        <Icon name="chevron-right" width={16} height={16} color={iconColor} />
      </View>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.description, { color: descColor }]}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 160,
    borderRadius: radius.sm,
    padding: spacing.lg + 1,
    gap: spacing.xs,
    justifyContent: 'flex-start',
  },
  neutral: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlighted: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.9,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.bodyLarge,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  description: {
    ...typography.body,
    lineHeight: 22.75,
  },
});
