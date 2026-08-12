import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/design-tokens';

/**
 * Renders nothing when there is no error, so call sites can drop it in
 * unconditionally: `<ErrorBanner message={error} />`.
 *
 * Worth having because RLS denials read as *empty*, not as failures — a screen
 * that discards its hook's `error` shows zeros and an empty list, which is
 * indistinguishable from a business with no data yet. See supabase/README.md
 * → "Troubleshooting: everything reads as zero".
 */
export function ErrorBanner({ message }: { message: string | null | undefined }) {
  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  text: {
    ...typography.body,
    color: colors.danger,
  },
});
