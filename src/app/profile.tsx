import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import { useAuth } from '@/hooks/use-auth';

/*
  Reached from the person icon in the top app bar, from any tab. That icon used to be
  inert while the account details sat at the bottom of the More tab — this is the
  destination it always implied.

  Signing out needs no navigation call: clearing the session re-renders RootNavigator
  into <SignInScreen/>, which unmounts this modal along with the whole tab tree.
*/
export default function ProfileScreen() {
  const { appUser, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Profile"
        leftIcon="chevron-right"
        leftIconRotation={180}
        onLeftPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
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
