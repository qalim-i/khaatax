import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/design-tokens';

interface StatTileProps {
  label: string;
  value: string | number;
  valueColor?: string;
  bordered?: boolean;
  /** Supply to make the tile a drill-down; omit and it renders inert as before. */
  onPress?: () => void;
}

export function StatTile({
  label,
  value,
  valueColor = colors.textPrimary,
  bordered,
  onPress,
}: StatTileProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      style={[styles.tile, bordered && styles.bordered]}
      onPress={onPress}
      hitSlop={onPress ? 8 : undefined}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: 4,
  },
  bordered: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: 17,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  value: {
    ...typography.statValue,
    fontWeight: '700',
  },
});
