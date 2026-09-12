import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { getEarnings, useTrip } from '../api/driver';
import { useQuery } from '../api/useQuery';
import { distance, money } from '../lib/format';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'TripCompleted'>;

/** Ride request state COMPLETED. Shows the driver's net first - the fare is the rider's number. */
export function TripCompletedScreen({ navigation, route }: Props) {
  const completed = useTrip(route.params?.tripId);
  const { data: earnings } = useQuery(getEarnings);
  // The platform books gross, commission and net when the trip settles; this is that row, not an
  // arithmetic the phone did on the fare.
  const line = earnings?.recent.find((entry) => entry.tripId === route.params?.tripId);
  const currency = completed?.currency ?? earnings?.currency ?? 'INR';

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button
            label="Rate the rider"
            onPress={() =>
              navigation.replace('RateRider', {
                rideId: completed?.rideId,
                riderName: completed?.riderName,
              })
            }
          />
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
        <Text style={styles.net}>{line ? money(line.netAmountMinor, currency) : '--'}</Text>
        <Text style={styles.note}>added to today's earnings</Text>
      </View>

      <View style={styles.card}>
        <Line
          label="Trip fare"
          value={line ? money(line.grossAmountMinor, currency) : '--'}
        />
        <Line
          label={line ? `Platform fee (${Math.round(line.commissionRate * 100)}%)` : 'Platform fee'}
          value={line ? `-${money(line.commissionMinor, currency)}` : '--'}
          muted
        />
        <View style={styles.divider} />
        <Line label="You earned" value={line ? money(line.netAmountMinor, currency) : '--'} strong />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryRoute}>
          {completed
            ? `${completed.pickupAddress ?? 'Pickup'} → ${completed.destinationAddress ?? 'Drop-off'}`
            : 'Trip complete'}
        </Text>
        <Text style={styles.summaryMeta}>
          {completed?.actualDistanceMeters == null
            ? ''
            : `${distance(completed.actualDistanceMeters)} · `}
          {completed?.paymentMethod === 'CASH' ? 'Cash at drop-off' : 'Paid online'}
        </Text>
      </View>

      <View style={styles.today}>
        <Ionicons name="trending-up" size={17} color={colors.success} />
        <Text style={styles.todayText}>
          {earnings ? money(earnings.ledgerBalanceMinor, earnings.currency) : '--'} owed to you
          right now
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
