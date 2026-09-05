import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatMoney,
  formatWhen,
  isCancelled,
  isLive,
  listRides,
  rideStatusLabel,
  type Ride,
} from '../api/rides';
import { listBookings, type ShuttleBooking } from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { BrandLoader } from '../components/BrandLoader';
import { Chip } from '../components/Chip';
import { RouteStops } from '../components/RouteStops';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'MyRides'>;

const FILTERS = ['All', 'Completed', 'Cancelled'] as const;

export function MyRidesScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const { data, loading, error, refetch } = useQuery(listRides, []);
  // Shuttle seats are booked through a different endpoint, but a rider does not think of them as
  // a different thing: they are trips they paid for, and they belong on the same list.
  const { data: shuttle, refetch: refetchShuttle } = useQuery(listBookings, []);

  // Filtered here rather than server-side: the endpoint returns this rider's own history, which
  // is tens of rows, not the thousands that would make a round trip worth it.
  const rides = (data ?? []).filter((ride) => {
    if (filter === 'Completed') return ride.status === 'COMPLETED';
    if (filter === 'Cancelled') return isCancelled(ride.status);
    return true;
  });

  const seats = (shuttle ?? []).filter((booking) => {
    if (filter === 'Completed') return booking.status === 'BOARDED';
    if (filter === 'Cancelled') return booking.status === 'CANCELLED';
    return true;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Rides</Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={filter === option}
            onPress={() => setFilter(option)}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && data != null}
            onRefresh={() => {
              refetch();
              refetchShuttle();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {loading && data == null ? <BrandLoader size={72} label="Loading your rides" style={styles.spinner} /> : null}

        {error ? (
          <Pressable onPress={refetch} style={styles.notice} accessibilityRole="button">
            <Text style={styles.noticeText}>{error}</Text>
            <Text style={styles.noticeAction}>Tap to try again</Text>
          </Pressable>
        ) : null}

        {!loading && !error && rides.length === 0 && seats.length === 0 ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {filter === 'All' ? 'No rides yet.' : `No ${filter.toLowerCase()} rides.`}
            </Text>
          </View>
        ) : null}

        {seats.map((booking) => (
          <ShuttleCard key={booking.id} booking={booking} />
        ))}

        {rides.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            onPress={() => navigation.navigate('TripDetails', { rideId: ride.id })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * A booked shuttle seat.
 *
 * Not a Pressable: there is no shuttle trip screen to open, and a card that does nothing when
 * tapped is worse than one that plainly does not.
 */
function ShuttleCard({ booking }: { booking: ShuttleBooking }) {
  const cancelled = booking.status === 'CANCELLED';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.status, cancelled && styles.statusCancelled]}>
          <Ionicons
            name={cancelled ? 'close' : 'bus'}
            size={11}
            color={cancelled ? colors.danger : colors.primary}
          />
          <Text style={[styles.statusText, cancelled && styles.statusTextCancelled]}>
            {cancelled ? 'Cancelled' : `Seat ${booking.seatLabel}`}
          </Text>
        </View>
        <Text style={styles.tier}>{booking.routeName}</Text>
        <Text style={styles.fare}>
          {booking.passId ? 'Pass' : formatMoney(booking.fareMinor, booking.currency)}
        </Text>
      </View>

      <RouteStops
        compact
        pickup={{ name: booking.boardingStopName }}
        dropoff={{ name: booking.alightingStopName }}
      />

      <Text style={styles.when}>{formatWhen(booking.departsAt)}</Text>
    </View>
  );
}

function RideCard({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  const cancelled = isCancelled(ride.status);
  const live = isLive(ride.status);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.status, cancelled && styles.statusCancelled]}>
          <Ionicons
            name={cancelled ? 'close' : live ? 'ellipse' : 'checkmark'}
            size={11}
            color={cancelled ? colors.danger : colors.primary}
          />
          <Text style={[styles.statusText, cancelled && styles.statusTextCancelled]}>
            {rideStatusLabel(ride.status)}
          </Text>
        </View>
        <Text style={styles.tier}>{ride.rideTypeCode}</Text>
        <Text style={styles.fare}>{formatMoney(ride.quotedFareMinor, ride.currency)}</Text>
      </View>

      <RouteStops
        compact
        pickup={{ name: ride.pickupAddress ?? 'Pickup' }}
        dropoff={{ name: ride.destinationAddress ?? 'Destination' }}
        style={styles.stops}
      />

      <View style={styles.cardFooter}>
        <Text style={styles.when}>{formatWhen(ride.requestedAt)}</Text>
        {/* No duration or rating here: the list endpoint carries neither, and inventing them is
            how a screen starts lying about a completed trip. */}
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  heading: {
    ...type.title,
    color: colors.text,
  },
  spinner: {
    marginTop: spacing.xl,
  },
  notice: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  noticeText: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  noticeAction: {
    ...type.label,
    color: colors.primary,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(255, 92, 122, 0.14)',
  },
  statusText: {
    ...type.caption,
    fontSize: 11,
    color: colors.primary,
  },
  statusTextCancelled: {
    color: colors.danger,
  },
  tier: {
    ...type.caption,
    flex: 1,
    color: colors.textMuted,
  },
  fare: {
    ...type.button,
    fontSize: 17,
    color: colors.text,
  },
  stops: {
    marginTop: spacing.lg,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  when: {
    ...type.caption,
    color: colors.textMuted,
  },
});
