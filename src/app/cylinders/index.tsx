import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MenuLinkCard } from '@/components/ui/menu-link-card';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, spacing, typography } from '@/constants/design-tokens';

export default function CylinderMenuScreen() {
  return (
    <View style={styles.container}>
      <TopAppBar title="KhaataX" leftIcon="menu" rightIcon="account" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBlock}>
          <Text style={styles.h2}>Cylinder Management</Text>
          <Text style={styles.subtitle}>Overview and operations for cylinder stock and ledgers.</Text>
        </View>

        <View style={styles.cards}>
          <MenuLinkCard
            icon="warehouse"
            iconSize={{ width: 25, height: 25 }}
            title="Cylinder Inventory"
            description="View real-time stock levels, cylinder status, and warehouse overview."
            onPress={() => router.push('/cylinders/stock')}
          />
          <MenuLinkCard
            icon="people-group"
            iconSize={{ width: 30, height: 15 }}
            title="Party Ledger"
            description="Manage customer accounts, track outstanding balances, and view transaction history."
            onPress={() => router.push('/cylinders/parties')}
          />
          <MenuLinkCard
            icon="transaction-plus"
            iconSize={{ width: 25, height: 25 }}
            title="New Transaction"
            description="Record new cylinder deliveries, empty returns, and cash receipts."
            onPress={() => router.push('/cylinders/new-transaction')}
            highlighted
          />
        </View>
      </ScrollView>
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
    gap: 4,
    paddingBottom: spacing.xs + 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  cards: {
    gap: spacing.lg,
  },
});
