import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdjustStockModal } from '@/components/stock/adjust-stock-modal';
import { StockTile } from '@/components/stock/stock-tile';
import { Icon } from '@/components/ui/icon';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, spacing, typography } from '@/constants/design-tokens';
import { useStock } from '@/hooks/use-stock';
import type { StockStatus } from '@/types/db';

const TILE_CONFIG: {
  status: StockStatus;
  label: string;
  subtitle: string;
  icon: 'check-circle' | 'empty-circle' | 'truck' | 'refill' | 'warning-triangle';
  accentColor: string;
  backgroundColor: string;
  labelColor?: string;
  valueColor?: string;
  subtitleColor?: string;
  wide?: boolean;
}[] = [
  {
    status: 'filled',
    label: 'Filled',
    subtitle: 'Ready to dispatch',
    icon: 'check-circle',
    accentColor: colors.success,
    backgroundColor: colors.background,
  },
  {
    status: 'empty',
    label: 'Empty',
    subtitle: 'Awaiting refill',
    icon: 'empty-circle',
    accentColor: '#8D8D8D',
    backgroundColor: colors.background,
  },
  {
    status: 'at_customer',
    label: 'At Customer',
    subtitle: 'Currently deployed',
    icon: 'truck',
    accentColor: colors.primary,
    backgroundColor: colors.background,
  },
  {
    status: 'under_refill',
    label: 'Under Refill',
    subtitle: 'At filling plant',
    icon: 'refill',
    accentColor: '#78A9FF',
    backgroundColor: colors.background,
  },
  {
    status: 'damaged',
    label: 'Damaged / Maint.',
    subtitle: 'Needs inspection',
    icon: 'warning-triangle',
    accentColor: colors.danger,
    backgroundColor: '#FFF1F1',
    labelColor: '#750E13',
    valueColor: '#750E13',
    subtitleColor: colors.danger,
    wide: true,
  },
];

export default function StockSummaryScreen() {
  const { rows, loading, adjust, quantityOf } = useStock();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TopAppBar title="Stock Summary" leftIcon="chevron-right" leftIconRotation={180} onLeftPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBlock}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.h2}>Cylinder Inventory</Text>
            <Text style={styles.subtitle}>Real-time overview of current stock distribution.</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.exportButton}
              onPress={() => Alert.alert('Export', 'PDF export lands in Phase 4.')}>
              <Icon name="export" width={12} height={12} color={colors.textPrimary} />
              <Text style={styles.exportLabel}>Export</Text>
            </Pressable>
            <Pressable style={styles.receiveButton} onPress={() => setModalVisible(true)}>
              <Icon name="plus" width={10.5} height={10.5} color={colors.white} />
              <Text style={styles.receiveLabel}>Receive Stock</Text>
            </Pressable>
          </View>
        </View>

        {!loading && rows.length === 0 ? (
          <Text style={styles.emptyState}>No stock rows found. Seed the `stock` table with the 5 canonical statuses.</Text>
        ) : (
          <View style={styles.grid}>
            {TILE_CONFIG.map((tile) => (
              <StockTile
                key={tile.status}
                label={tile.label}
                value={quantityOf(tile.status)}
                subtitle={tile.subtitle}
                icon={tile.icon}
                accentColor={tile.accentColor}
                backgroundColor={tile.backgroundColor}
                labelColor={tile.labelColor}
                valueColor={tile.valueColor}
                subtitleColor={tile.subtitleColor}
                wide={tile.wide}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <AdjustStockModal visible={modalVisible} onClose={() => setModalVisible(false)} onSubmit={adjust} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  headerBlock: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTextBlock: {
    gap: 4,
  },
  h2: {
    ...typography.h2,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.sm + 1,
    backgroundColor: colors.surface,
  },
  exportLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  receiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 2,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary,
  },
  receiveLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  emptyState: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
