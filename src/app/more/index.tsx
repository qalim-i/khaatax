import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MenuLinkCard } from '@/components/ui/menu-link-card';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useAuth } from '@/hooks/use-auth';

export default function MoreScreen() {
  const { appUser, signOut } = useAuth();
  const isOwner = appUser?.role === 'owner';

  return (
    <View style={styles.container}>
      <TopAppBar title="More" />
      <ScrollView contentContainerStyle={styles.content}>
        {/*
          Payroll is owner-only. Managers don't get this entry point at all — and
          the `employees` table denies them at the database level regardless, so
          hiding the card is presentation, not the security boundary
          (CLAUDE.md Non-Negotiable Rule 1).
        */}
        {isOwner ? (
          <View style={styles.cards}>
            <MenuLinkCard
              icon="people"
              iconSize={{ width: 28, height: 20 }}
              title="Payroll"
              description="Manage the employee list and see this month's total payroll cost."
              onPress={() => router.push('/more/payroll')}
              highlighted
            />
          </View>
        ) : null}

        <View style={styles.phaseBlock}>
          <Text style={styles.phase}>Exports</Text>
          <Text style={styles.description}>
            Invoice and Delivery Challan PDFs are generated from a party&apos;s transaction
            history — open Cylinders → Party Ledger, pick a party, then tap a transaction.
          </Text>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.accountName}>{appUser?.name ?? 'Signed in'}</Text>
          <Text style={styles.accountRole}>{appUser?.role}</Text>
          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutLabel}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  cards: {
    gap: spacing.lg,
  },
  phaseBlock: {
    // Deliberately not `alignItems: 'center'` — that shrink-wraps children to
    // their natural width, so a long line pushes the whole column wider than the
    // screen instead of wrapping. The two Texts centre themselves via textAlign.
    gap: spacing.xxs,
  },
  phase: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  accountCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  accountName: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  accountRole: {
    ...typography.body,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: spacing.sm,
  },
  signOutButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  signOutLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.danger,
  },
});
