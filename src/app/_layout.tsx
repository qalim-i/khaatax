import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-splash';
import { WalkthroughModal } from '@/components/onboarding/walkthrough-modal';
import { SignInScreen } from '@/components/sign-in-screen';
import { colors } from '@/constants/design-tokens';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { OnboardingProvider, useOnboarding } from '@/hooks/use-onboarding';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading } = useAuth();
  const { visible, slides, dismiss } = useOnboarding();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <SignInScreen />;
  }

  /*
    The tab bar lives in the `(tabs)` group so this root Stack can sit above it and
    hold the routes that aren't *places*: New Transaction, Add Expense, Record
    Payment and Profile. Presented as modals, they open over whichever tab you're on and dismiss
    straight back to it — previously they were cross-tab pushes, so dismissing one
    from Home landed you in the Cylinders or Expenses tab instead.
  */
  /*
    The walkthrough is a sibling of the Stack, not a route in it: RN's Modal
    renders in its own native window, so it sits above the tabs and above the
    modal routes without having to be pushed from whichever screen is showing.
    It lives inside this branch so it can never appear over the sign-in screen.
  */
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-transaction" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-expense" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-payment" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
      </Stack>
      <WalkthroughModal visible={visible} slides={slides} onDone={dismiss} />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        <OnboardingProvider>
          <RootNavigator />
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
