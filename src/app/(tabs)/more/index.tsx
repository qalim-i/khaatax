import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MenuLinkCard } from '@/components/ui/menu-link-card';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, spacing, typography } from '@/constants/design-tokens';
import { useAuth } from '@/hooks/use-auth';

export default function MoreScreen() {
  const { appUser } = useAuth();
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

        {/*
          Was a paragraph spelling out "Cylinders → Party Ledger → pick a party" in
          words. If the screen knows the route, it should offer it.
        */}
        <View style={styles.cards}>
          <MenuLinkCard
            icon="export"
            iconSize={{ width: 24, height: 24 }}
            title="Invoice & Delivery Challan"
            description="Open a party, then tap a transaction to generate and share its PDF."
            onPress={() => router.navigate('/cylinders/parties')}
          />
        </View>

        {/* A note, not a control — deliberately not a card, so it isn't tappable. */}
        <View style={styles.settingsBlock}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <Text style={styles.settingsDescription}>Settings will come soon.</Text>
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
  settingsBlock: {
    // Deliberately not `alignItems: 'center'` — that shrink-wraps children to
    // their natural width, so a long line pushes the whole column wider than the
    // screen instead of wrapping. The two Texts centre themselves via textAlign.
    gap: spacing.xxs,
  },
  settingsTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  settingsDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
