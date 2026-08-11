import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/design-tokens';
import { Icon, type IconName } from '@/components/ui/icon';

interface TopAppBarProps {
  title: string;
  leftIcon?: IconName;
  onLeftPress?: () => void;
  leftIconRotation?: number;
  rightIcon?: IconName;
  onRightPress?: () => void;
}

export function TopAppBar({
  title,
  leftIcon,
  onLeftPress,
  leftIconRotation,
  rightIcon,
  onRightPress,
}: TopAppBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable style={styles.iconButton} onPress={onLeftPress} disabled={!onLeftPress} hitSlop={8}>
        {leftIcon ? (
          <Icon
            name={leftIcon}
            width={20}
            height={20}
            style={leftIconRotation ? { transform: [{ rotate: `${leftIconRotation}deg` }] } : undefined}
          />
        ) : (
          <View style={styles.iconSpacer} />
        )}
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Pressable style={styles.iconButton} onPress={onRightPress} disabled={!onRightPress} hitSlop={8}>
        {rightIcon ? <Icon name={rightIcon} width={20} height={20} /> : <View style={styles.iconSpacer} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: {
    width: 20,
    height: 20,
  },
  title: {
    ...typography.h1,
    fontWeight: '600',
    color: colors.primary,
  },
});
