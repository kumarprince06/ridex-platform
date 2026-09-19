import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SuccessTick } from '../components/SuccessTick';
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
  const cash = completed?.paymentMethod === 'CASH';
  // Negative means the driver kept cash that includes the platform's commission and owes it back.
  const ledger = earnings?.ledgerBalanceMinor;

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
          <SuccessTick />
        </View>

        <Text style={styles.eyebrow}>TRIP COMPLETE</Text>
        <Text style={styles.net}>{line ? money(line.netAmountMinor, currency) : '--'}</Text>
        <Text style={styles.note}>added to today's earnings</Text>
      </View>

      {cash && completed?.finalFareMinor != null ? (
        // The one thing a cash drop-off must not miss: how much to take from the rider.
        <View style={styles.collect}>
          <Ionicons name="cash" size={22} color={colors.onPrimary} />
          <Text style={styles.collectText}>Collect {money(completed.finalFareMinor, currency)} in cash</Text>
        </View>
      ) : null}

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

      {ledger == null ? null : ledger < 0 ? (
        <View style={[styles.today, styles.owing]}>
          <Ionicons name="alert-circle" size={17} color={colors.warning} />
          <Text style={styles.todayText}>
            You owe RideX {money(-ledger, currency)} - platform fees on cash you collected
          </Text>
        </View>
      ) : (
        <View style={styles.today}>
          <Ionicons name="trending-up" size={17} color={colors.success} />
          <Text style={styles.todayText}>{money(ledger, currency)} owed to you right now</Text>
        </View>
      )}
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
  owing: {
    backgroundColor: colors.amberSurface,
  },
  collect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  collectText: {
    ...type.button,
    fontSize: 18,
    color: colors.onPrimary,
  },
  actions: {
    gap: spacing.md,
  },
});
