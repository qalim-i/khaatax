import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { colors, spacing, typography } from '@/constants/design-tokens';
import { logError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// No Figma frame exists for login (GEN-2 has no Phase 1 design source) — this is a
// minimal, functional placeholder so the app is reachable. Manager/owner accounts are
// provisioned by the developer directly in Supabase Auth; there is no sign-up here.
export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    // GoTrue's own messages are kept here rather than routed through
    // toUserMessage: "Invalid login credentials" is deliberately worded not to
    // reveal whether the address exists, and rewriting it would only make a
    // failed sign-in harder to act on. The detail still goes to the dev log.
    if (signInError) {
      logError('SignInScreen', signInError);
      setError(signInError.message);
    }
  }

  const canSubmit = !!email && !!password && !loading;

  /*
    The form was a bare centred column, so the keyboard covered the password field
    and the Sign In button with no way to reach them. Two things fix it together:

    - `KeyboardAvoidingView` shrinks the available space when the keyboard opens.
      Android needs an explicit behaviour too — it was `undefined` here, which is a
      no-op, and the app runs edge-to-edge, so the window does not resize on its own.
    - The `ScrollView` is what actually rescues the field: React Native scrolls a
      focused input back into view inside one, and it leaves the form reachable on a
      short screen even with no keyboard up. `flexGrow` keeps the column centred
      while it still fits.
  */
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>KhaataX</Text>
        <Text style={styles.subtitle}>Sign in with the account provided by your admin.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@company.com"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="password"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="go"
            onSubmitEditing={() => {
              if (canSubmit) handleSignIn();
            }}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PrimaryButton label="Sign In" onPress={handleSignIn} disabled={!email || !password} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.brand,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  field: {
    gap: spacing.xxs,
  },
  label: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
