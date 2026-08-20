import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Approved'>;

/** DriverOnboardingStatus.APPROVED - the moment the driver becomes eligible for dispatch. */
export function ApprovedScreen({ navigation }: Props) {
  return (
    <Screen
      footer={
        <Button
          label="Start driving"
          onPress={() =>
            // reset, not navigate: onboarding must not be swipeable from the tabs once it is done.
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
          }
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={40} color={colors.onPrimary} />
        </View>

        <Text style={styles.eyebrow}>APPROVED</Text>
        <Text style={styles.title}>You are cleared to drive</Text>
        <Text style={styles.subtitle}>
          Your documents checked out. Go online whenever you are ready and offers will start coming
          in.
        </Text>
      </View>

      <View style={styles.tips}>
        {[
          { icon: 'power' as const, text: 'Go online from the Drive tab to start receiving offers' },
          { icon: 'cash-outline' as const, text: 'Earnings update after every completed trip' },
          { icon: 'calendar-outline' as const, text: 'Payouts run weekly to your saved account' },
        ].map((tip) => (
          <View key={tip.text} style={styles.tip}>
            <Ionicons name={tip.icon} size={18} color={colors.primary} />
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}
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
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.primary,
    marginBottom: spacing.sm,
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
  tips: {
    gap: spacing.md,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  tipText: {
    ...type.body,
    flex: 1,
    color: colors.text,
  },
});
