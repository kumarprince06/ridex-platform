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
        // Completed and current segments both read as active: "Profile" stays lit once the
        // driver has moved on to "Vehicle".
        const active = index <= currentIndex;

        return (
          <View key={step} style={styles.segment}>
            <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>
              {step}
            </Text>
            <View style={[styles.bar, active ? styles.barActive : styles.barIdle]} />
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
  labelIdle: {
    color: colors.textFaint,
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
