import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/design-tokens';

interface StatTileProps {
  label: string;
  value: string | number;
  valueColor?: string;
  bordered?: boolean;
}

export function StatTile({ label, value, valueColor = colors.textPrimary, bordered }: StatTileProps) {
  return (
    <View style={[styles.tile, bordered && styles.bordered]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
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
