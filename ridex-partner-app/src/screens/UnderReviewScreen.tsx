import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'UnderReview'>;

const RECEIVED = [
  'Profile details',
  'Vehicle details',
  "Driver's licence",
  'Vehicle registration',
  'Insurance certificate',
];

/**
 * DriverOnboardingStatus.UNDER_REVIEW. A dead end by design: there is nothing for the driver to
 * do, so the screen spends its space proving the submission arrived rather than pretending there
 * is an action left.
 */
export function UnderReviewScreen({ navigation }: Props) {
  return (
    <Screen
      footer={
        <View style={styles.actions}>
          {/* Stand-in for the status poll: tapping simulates approval landing. */}
          <Button label="Check status" onPress={() => navigation.replace('Approved')} />
          <Button label="Contact support" variant="secondary" />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="hourglass" size={34} color={colors.warning} />
        </View>

        <Text style={styles.title}>We are reviewing your application</Text>
        <Text style={styles.subtitle}>
          Most reviews finish within 48 hours. We will notify you the moment a decision is made.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>RECEIVED</Text>

        {RECEIVED.map((item) => (
          <View key={item} style={styles.row}>
            <Ionicons name="checkmark-circle" size={17} color={colors.success} />
            <Text style={styles.rowLabel}>{item}</Text>
          </View>
        ))}

        <View style={styles.divider} />
        <Text style={styles.submitted}>Submitted today at 4:12 PM · Reference DRV-77412</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.amberSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...type.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardLabel: {
    ...type.eyebrow,
    color: colors.textFaint,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  rowLabel: {
    ...type.body,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  submitted: {
    ...type.caption,
    color: colors.textFaint,
  },
  actions: {
    gap: spacing.md,
  },
});
