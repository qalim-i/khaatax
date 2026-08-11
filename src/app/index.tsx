import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ManagerDashboard } from '@/components/home/manager-dashboard';
import { OwnerDashboard } from '@/components/home/owner-dashboard';
import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors } from '@/constants/design-tokens';
import { useAuth } from '@/hooks/use-auth';

export default function HomeScreen() {
  const { appUser, loading } = useAuth();

  return (
    <View style={styles.container}>
      <TopAppBar title="KhaataX" leftIcon="menu" rightIcon="account" />
      {loading || !appUser ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : appUser.role === 'owner' ? (
        <OwnerDashboard />
      ) : (
        <ManagerDashboard />
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
