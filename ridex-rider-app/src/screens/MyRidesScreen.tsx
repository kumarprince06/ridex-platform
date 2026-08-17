import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '../components/Chip';
import { RouteStops } from '../components/RouteStops';
import { Stars } from '../components/Stars';
import { Ride, RIDES } from '../data/mock';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'MyRides'>;

const FILTERS = ['All', 'Completed', 'Cancelled'] as const;

export function MyRidesScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const rides = filter === 'All' ? RIDES : RIDES.filter((ride) => ride.status === filter);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Rides</Text>
        <View style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </View>
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

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
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

function RideCard({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  const cancelled = ride.status === 'Cancelled';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.status, cancelled && styles.statusCancelled]}>
          <Ionicons
            name={cancelled ? 'close' : 'checkmark'}
            size={11}
            color={cancelled ? colors.danger : colors.primary}
          />
          <Text style={[styles.statusText, cancelled && styles.statusTextCancelled]}>
            {ride.status}
          </Text>
        </View>
        <Text style={styles.tier}>{ride.tier}</Text>
        <Text style={styles.fare}>{ride.fare}</Text>
      </View>

      <RouteStops
        compact
        pickup={{ name: ride.pickup }}
        dropoff={{ name: ride.dropoff }}
        style={styles.stops}
      />

      <View style={styles.cardFooter}>
        <Text style={styles.when}>{ride.when}</Text>
        <View style={styles.footerRight}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.duration}>{ride.duration}</Text>
          {ride.rating > 0 ? <Stars value={ride.rating} size={12} /> : null}
        </View>
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
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.16)',
  },
  filterButtonText: {
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
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  duration: {
    ...type.caption,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
});
