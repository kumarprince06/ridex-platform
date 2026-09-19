import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme';

const STEPS = ['Profile', 'Vehicle', 'Documents', 'Payout'] as const;

export type SetupStep = (typeof STEPS)[number];

/** The four-segment header across driver onboarding, one segment per DriverOnboardingStatus step. */
export function StepProgress({ current }: { current: SetupStep }) {
  const currentIndex = STEPS.indexOf(current);

  return (
    <View style={styles.row}>
      {STEPS.map((step, index) => {
        // Completed bars stay filled as progress, but only the current step's label is lit - two
        // lit labels read as two selected tabs.
        const done = index < currentIndex;
        const current = index === currentIndex;

        return (
          <View key={step} style={styles.segment}>
            <Text
              style={[
                styles.label,
                current ? styles.labelActive : done ? styles.labelDone : styles.labelIdle,
              ]}
            >
              {done ? `✓ ${step}` : step}
            </Text>
            <View
              style={[
                styles.bar,
                current ? styles.barActive : done ? styles.barDone : styles.barIdle,
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  segment: {
    flex: 1,
  },
  label: {
    ...type.label,
    marginBottom: spacing.sm,
  },
  labelActive: {
    color: colors.primary,
  },
  labelDone: {
    color: colors.textMuted,
  },
  labelIdle: {
    color: colors.textFaint,
  },
  barDone: {
    backgroundColor: colors.primary,
    opacity: 0.45,
  },
  bar: {
    height: 3,
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: colors.primary,
  },
  barIdle: {
    backgroundColor: colors.border,
  },
});
