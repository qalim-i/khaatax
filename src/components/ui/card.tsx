import { StyleSheet, View, type ViewProps } from 'react-native';

import { cardShadow, colors, radius, spacing } from '@/constants/design-tokens';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md - 1,
    gap: spacing.md,
    ...cardShadow,
  },
});
