import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { listTrips, tripState, type TripState, type TripSummary } from '../api/driver';
import { useQuery } from '../api/useQuery';
import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { Stars } from '../components/Stars';
import { distance, money, when } from '../lib/format';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Trips'>;

const FILTERS = ['All', 'Completed', 'Cancelled'] as const;

export function TripsScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const { data, loading, error } = useQuery(listTrips);

  const trips = (data ?? []).filter((trip) =>
    filter === 'All'
      ? true
      : filter === 'Cancelled'
        ? tripState(trip.status) === 'cancelled'
        : tripState(trip.status) === 'completed',
  );

  return (
    <Screen title="Trips">
      <View style={styles.filters}>
        {FILTERS.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={filter === option}
            onPress={() => setFilter(option)}
            style={styles.filter}
          />
        ))}
      </View>

      {loading ? <Text style={styles.empty}>Loading your trips...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {trips.map((trip) => (
        <Pressable
          key={trip.tripId}
          accessibilityRole="button"
          onPress={() => navigation.navigate('TripDetails', { tripId: trip.tripId })}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.head}>
            <Text style={styles.when}>{when(trip.completedAt ?? new Date())}</Text>
            <StatusPill status={trip.status} />
          </View>

          <Text style={styles.route} numberOfLines={1}>
            {trip.pickupAddress ?? 'Pickup'} → {trip.destinationAddress ?? 'Drop-off'}
          </Text>

          <Text style={styles.meta}>
            {trip.riderName}
            {trip.distanceMeters == null ? '' : ` · ${distance(trip.distanceMeters)}`}
          </Text>

          <View style={styles.foot}>
            {trip.riderRating ? (
              <Stars value={trip.riderRating} />
            ) : (
              <Text style={styles.noRating}>Rider hasn't rated you yet</Text>
            )}
            {/* What the driver earned, not the fare: the two differ by the platform's commission. */}
            <Text style={styles.net}>
              {trip.earnedMinor == null ? '--' : money(trip.earnedMinor, trip.currency)}
            </Text>
          </View>
        </Pressable>
      ))}

      {!loading && trips.length === 0 ? (
        <Text style={styles.empty}>{filter === 'All' ? 'No trips yet.' : `No ${filter.toLowerCase()} trips yet.`}</Text>
      ) : null}
    </Screen>
  );
}

const PILL: Record<TripState, { label: string; fg: string; bg: string }> = {
  completed: { label: 'Completed', fg: colors.success, bg: colors.successSurface },
  cancelled: { label: 'Cancelled', fg: colors.danger, bg: colors.dangerSurface },
  active: { label: 'In progress', fg: colors.primary, bg: colors.surfaceAlt },
};

function StatusPill({ status }: { status: string }) {
  const pill = PILL[tripState(status)];
  return (
    <View style={[styles.pill, { backgroundColor: pill.bg }]}>
      <Text style={[styles.pillLabel, { color: pill.fg }]}>{pill.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filter: {
    flex: 1,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  when: {
    ...type.caption,
    color: colors.textMuted,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pillLabel: {
    ...type.caption,
    fontSize: 11,
  },
  route: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
    marginTop: spacing.sm,
  },
  meta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noRating: {
    ...type.caption,
    color: colors.textFaint,
  },
  net: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
