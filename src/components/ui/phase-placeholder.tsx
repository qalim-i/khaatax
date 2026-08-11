import { StyleSheet, Text, View } from 'react-native';

import { TopAppBar } from '@/components/ui/top-app-bar';
import { colors, spacing, typography } from '@/constants/design-tokens';

interface PhasePlaceholderProps {
  title: string;
  phaseLabel: string;
  description: string;
}

export function PhasePlaceholder({ title, phaseLabel, description }: PhasePlaceholderProps) {
  return (
    <View style={styles.container}>
      <TopAppBar title={title} />
      <View style={styles.body}>
        <Text style={styles.phase}>{phaseLabel}</Text>
        <Text style={styles.description}>{description}</Text>
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
  },
});
