import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdjustStockModal } from '@/components/stock/adjust-stock-modal';
import { StockTile } from '@/components/stock/stock-tile';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Icon } from '@/components/ui/icon';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, spacing, typography } from '@/constants/design-tokens';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
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
  const { rows, loading, error, adjust, quantityOf, refresh } = useStock();

  useRefreshOnFocus(refresh);
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
          {/*
            No Export button here by design. Phase 4 shipped PDF export for
            Invoice and Delivery Challan only (PRD INV-5); a stock-summary export
            was never in the PRD, and a button that only explains its own absence
            is worse than no button. Invoice/DC PDFs live on Party Detail.
          */}
          <View style={styles.headerActions}>
            <Pressable style={styles.receiveButton} onPress={() => setModalVisible(true)}>
              <Icon name="plus" width={10.5} height={10.5} color={colors.white} />
              <Text style={styles.receiveLabel}>Receive Stock</Text>
            </Pressable>
          </View>
        </View>

        {/*
          Covers both a denied read (tiles all show 0) and a denied adjustment,
          which previously left the modal closing with nothing changed and no
          explanation.
        */}
        <ErrorBanner message={error} />

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
