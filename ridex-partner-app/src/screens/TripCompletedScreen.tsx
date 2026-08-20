import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { EARNINGS, OFFER, TRIPS } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'TripCompleted'>;

/** Ride request state COMPLETED. Shows the driver's net first - the fare is the rider's number. */
export function TripCompletedScreen({ navigation }: Props) {
  const trip = TRIPS[0];

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button label="Rate the rider" onPress={() => navigation.replace('RateRider')} />
          <Button
            label="Back to driving"
            variant="secondary"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
          />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={34} color={colors.onPrimary} />
        </View>

        <Text style={styles.eyebrow}>TRIP COMPLETE</Text>
        <Text style={styles.net}>{trip.net}</Text>
        <Text style={styles.note}>added to today's earnings</Text>
      </View>

      <View style={styles.card}>
        <Line label="Trip fare" value={trip.gross} />
        <Line label="Platform fee" value="-$3.68" muted />
        <View style={styles.divider} />
        <Line label="You earned" value={trip.net} strong />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryRoute}>
          {OFFER.pickup} → {OFFER.dropoff}
        </Text>
        <Text style={styles.summaryMeta}>
          {trip.distance} · {trip.duration} · {trip.payment}
        </Text>
      </View>

      <View style={styles.today}>
        <Ionicons name="trending-up" size={17} color={colors.success} />
        <Text style={styles.todayText}>
          {EARNINGS.Today.net} earned today across {EARNINGS.Today.trips} trips
        </Text>
      </View>
    </Screen>
  );
}

function Line({
  label,
  value,
  muted = false,
  strong = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.lineStrong]}>{label}</Text>
      <Text style={[styles.lineValue, muted && styles.lineMuted, strong && styles.lineStrong]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.success,
  },
  net: {
    ...type.hero,
    fontSize: 44,
    color: colors.text,
    marginTop: spacing.sm,
  },
  note: {
    ...type.caption,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  lineLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  lineValue: {
    ...type.body,
    color: colors.text,
  },
  lineMuted: {
    color: colors.textMuted,
  },
  lineStrong: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  summary: {
    marginTop: spacing.lg,
  },
  summaryRoute: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  summaryMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  today: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSurface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  todayText: {
    ...type.caption,
    flex: 1,
    color: colors.text,
  },
  actions: {
    gap: spacing.md,
  },
});
