import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { HomeDashboard } from '@/components/home/home-dashboard';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors } from '@/constants/design-tokens';
import { useAuth } from '@/hooks/use-auth';

export default function HomeScreen() {
  const { appUser, loading } = useAuth();

  return (
    <View style={styles.container}>
      {/*
        No hamburger: there is no drawer, so it rendered permanently disabled. The
        person icon now opens the Profile modal instead of sitting inert while the
        account details lived at the bottom of the More tab.
      */}
      <TopAppBar title="KhaataX" rightIcon="account" onRightPress={() => router.push('/profile')} />
      {loading || !appUser ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <HomeDashboard />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
