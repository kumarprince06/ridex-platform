import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { getEarnings, getTrip, tripState } from '../api/driver';
import { useQuery } from '../api/useQuery';
import { RouteStops } from '../components/RouteStops';
import { Screen } from '../components/Screen';
import { Stars } from '../components/Stars';
import { distance, money, when } from '../lib/format';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'TripDetails'>;

/**
 * One finished trip, from the driver's side.
 *
 * <p>The fare breakdown comes from the earnings row rather than the trip: gross, commission and
 * net are what the platform actually booked, and docs/04 requires the three to stay
 * distinguishable rather than blended into one number.
 */
export function TripDetailsScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { data: trip, loading, error } = useQuery(() => getTrip(tripId), [tripId]);
  const { data: earnings } = useQuery(getEarnings);

  const line = earnings?.recent.find((entry) => entry.tripId === tripId);
  const currency = trip?.currency ?? earnings?.currency ?? 'INR';

  return (
    <Screen onBack={() => navigation.goBack()} title="Trip">
      {loading ? <Text style={styles.muted}>Loading...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {trip ? (
        <>
          <View style={styles.hero}>
            {tripState(trip.status) === 'cancelled' ? (
              <View style={styles.cancelledBadge}>
                <Ionicons name="close" size={30} color={colors.danger} />
              </View>
            ) : null}
            <Text style={styles.netLabel}>{tripState(trip.status) === 'cancelled' ? 'TRIP CANCELLED' : 'YOU EARNED'}</Text>
            <Text style={styles.net}>
              {line ? money(line.netAmountMinor, currency) : '--'}
            </Text>
            <Text style={styles.when}>
              {tripState(trip.status) === 'completed' && trip.completedAt
                ? when(trip.completedAt)
                : tripState(trip.status) === 'cancelled'
                  ? 'Cancelled before drop-off'
                  : 'In progress'}
            </Text>
          </View>

          <RouteStops
            pickup={{ name: trip.pickupAddress ?? 'Pickup' }}
            dropoff={{ name: trip.destinationAddress ?? 'Drop-off' }}
            style={styles.stops}
          />

          <View style={styles.card}>
            <Line label="Rider" value={trip.riderName} />
            <Line
              label="Distance"
              value={trip.actualDistanceMeters == null ? '--' : distance(trip.actualDistanceMeters)}
            />
            <Line
              label="Waiting"
              value={`${Math.round(trip.waitingSeconds / 60)} min`}
            />
            <Line
              label="Payment"
              value={
                tripState(trip.status) === 'cancelled'
                  ? 'Not charged'
                  : trip.paymentMethod === 'CASH'
                    ? 'Cash at drop-off'
                    : 'Paid online'
              }
              last
            />
          </View>

          <Text style={styles.sectionLabel}>FARE BREAKDOWN</Text>

          {/* Split, never blended: docs/04 requires gross, fee and net to stay distinguishable. */}
          <View style={styles.card}>
            {line ? (
              <>
                <Line label="Gross fare" value={money(line.grossAmountMinor, currency)} />
                <Line
                  label={`Platform fee (${Math.round(line.commissionRate * 100)}%)`}
                  value={`-${money(line.commissionMinor, currency)}`}
                />
                <Line label="Your net" value={money(line.netAmountMinor, currency)} last strong />
              </>
            ) : (
              <Line label="Not settled yet" value="--" last />
            )}
          </View>

          {trip.riderRating ? (
            <View style={styles.rating}>
              <Stars value={trip.riderRating} />
              <Text style={styles.ratingText}>{trip.riderName} rated this trip</Text>
            </View>
          ) : null}

          <View style={styles.support}>
            <Ionicons name="help-buoy" size={17} color={colors.primary} />
            <Text style={styles.supportText}>
              Something wrong with this trip? Open a support case.
            </Text>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Line({
  label,
  value,
  last = false,
  strong = false,
}: {
  label: string;
  value: string;
  last?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={[styles.line, !last && styles.lineBorder]}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    ...type.body,
    color: colors.textMuted,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
  hero: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  netLabel: {
    ...type.eyebrow,
    color: colors.textFaint,
  },
  net: {
    ...type.hero,
    color: colors.text,
    marginTop: spacing.xs,
  },
  when: {
    ...type.caption,
    color: colors.textMuted,
  },
  stops: {
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  lineBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  lineValue: {
    ...type.body,
    flexShrink: 1,
    textAlign: 'right',
    color: colors.text,
  },
  cancelledBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSurface,
    borderWidth: 2,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  lineStrong: {
    ...type.button,
    fontSize: 16,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.textFaint,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  ratingText: {
    ...type.caption,
    color: colors.textMuted,
  },
  support: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  supportText: {
    ...type.caption,
    flex: 1,
    color: colors.textMuted,
  },
});
