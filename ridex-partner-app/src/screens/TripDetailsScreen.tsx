import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { RouteStops } from '../components/RouteStops';
import { Screen } from '../components/Screen';
import { Stars } from '../components/Stars';
import { TRIPS } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'TripDetails'>;

export function TripDetailsScreen({ navigation, route }: Props) {
  const trip = TRIPS.find((item) => item.id === route.params.tripId) ?? TRIPS[0];

  return (
    <Screen onBack={() => navigation.goBack()} title={`Trip #${trip.id}`}>
      <View style={styles.hero}>
        <Text style={styles.netLabel}>YOU EARNED</Text>
        <Text style={styles.net}>{trip.net}</Text>
        <Text style={styles.when}>{trip.when}</Text>
      </View>

      <RouteStops
        pickup={{ name: trip.pickup }}
        dropoff={{ name: trip.dropoff }}
        style={styles.stops}
      />

      <View style={styles.card}>
        <Line label="Rider" value={trip.rider} />
        <Line label="Ride type" value={trip.tier} />
        <Line label="Distance" value={trip.distance} />
        <Line label="Duration" value={trip.duration} />
        <Line label="Payment" value={trip.payment} last />
      </View>

      <Text style={styles.sectionLabel}>FARE BREAKDOWN</Text>

      {/* Split, never blended: docs/04 requires gross, fee and net to stay distinguishable. */}
      <View style={styles.card}>
        <Line label="Gross fare" value={trip.gross} />
        <Line label="Platform fee" value="-$3.68" />
        <Line label="Tax" value="-$0.40" />
        <Line label="Tip" value="+$2.00" />
        <Line label="Your net" value={trip.net} last strong />
      </View>

      {trip.rating ? (
        <View style={styles.rating}>
          <Stars value={trip.rating} />
          <Text style={styles.ratingText}>{trip.rider} rated this trip</Text>
        </View>
      ) : null}

      <View style={styles.support}>
        <Ionicons name="help-buoy" size={17} color={colors.primary} />
        <Text style={styles.supportText}>Something wrong with this trip? Open a support case.</Text>
      </View>
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
    justifyContent: 'space-between',
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
    color: colors.text,
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
