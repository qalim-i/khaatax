import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useAuth } from '@/hooks/use-auth';

export default function MoreScreen() {
  const { appUser, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <TopAppBar title="More" />
      <View style={styles.body}>
        <Text style={styles.phase}>Coming in Phase 3</Text>
        <Text style={styles.description}>
          Payroll (owner only) and app settings/exports land here in a later phase.
        </Text>

        <View style={styles.accountCard}>
          <Text style={styles.accountName}>{appUser?.name ?? 'Signed in'}</Text>
          <Text style={styles.accountRole}>{appUser?.role}</Text>
          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutLabel}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  phase: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.primary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
