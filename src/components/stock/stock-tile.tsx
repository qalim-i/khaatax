import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { cardShadow, radius, spacing, typography } from '@/constants/design-tokens';

interface StockTileProps {
  label: string;
  value: number;
  subtitle: string;
  icon: IconName;
  accentColor: string;
  backgroundColor: string;
  labelColor?: string;
  valueColor?: string;
  subtitleColor?: string;
  wide?: boolean;
}

export function StockTile({
  label,
  value,
  subtitle,
  icon,
  accentColor,
  backgroundColor,
  labelColor,
  valueColor,
  subtitleColor,
  wide,
}: StockTileProps) {
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor, borderLeftColor: accentColor },
        wide ? styles.wide : styles.half,
      ]}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, labelColor ? { color: labelColor } : null]}>{label}</Text>
        <Icon name={icon} width={20} height={20} color={accentColor} />
      </View>
      <View style={styles.valueBlock}>
        <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
        <Text style={[styles.subtitle, subtitleColor ? { color: subtitleColor } : null]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 120,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md + 4,
    paddingRight: spacing.md,
    justifyContent: 'space-between',
    ...cardShadow,
  },
  half: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  wide: {
    flexBasis: '100%',
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.body,
    fontWeight: '500',
  },
  valueBlock: {
    marginTop: spacing.md,
    gap: 3,
  },
  value: {
    ...typography.statValueLarge,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
  },
});
