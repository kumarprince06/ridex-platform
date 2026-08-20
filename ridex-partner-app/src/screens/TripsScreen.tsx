import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { Stars } from '../components/Stars';
import { TRIPS, TripStatus } from '../data/mock';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Trips'>;

const FILTERS = ['All', 'Completed', 'Cancelled'] as const;

export function TripsScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const trips = filter === 'All' ? TRIPS : TRIPS.filter((trip) => trip.status === filter);

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

      {trips.map((trip) => (
        <Pressable
          key={trip.id}
          accessibilityRole="button"
          onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.head}>
            <Text style={styles.when}>{trip.when}</Text>
            <StatusPill status={trip.status} />
          </View>

          <Text style={styles.route} numberOfLines={1}>
            {trip.pickup} → {trip.dropoff}
          </Text>

          <Text style={styles.meta}>
            {trip.rider} · {trip.distance} · {trip.duration}
          </Text>

          <View style={styles.foot}>
            {trip.rating ? <Stars value={trip.rating} /> : <Text style={styles.noRating}>Not rated</Text>}
            <Text style={styles.net}>{trip.net}</Text>
          </View>
        </Pressable>
      ))}

      {trips.length === 0 ? <Text style={styles.empty}>No {filter.toLowerCase()} trips yet.</Text> : null}
    </Screen>
  );
}

function StatusPill({ status }: { status: TripStatus }) {
  const completed = status === 'Completed';

  return (
    <View
      style={[styles.pill, { backgroundColor: completed ? colors.successSurface : colors.dangerSurface }]}
    >
      <Text style={[styles.pillLabel, { color: completed ? colors.success : colors.danger }]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
