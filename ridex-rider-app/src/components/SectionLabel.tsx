import { StyleSheet, Text } from 'react-native';

import { colors, spacing, type } from '../theme';

/** The muted uppercase heading above each group: ACCOUNT, PREFERENCES, SUPPORT, PRIVACY. */
export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
});
