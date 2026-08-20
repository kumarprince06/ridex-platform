import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Offer } from '../data/mock';
import { colors, radius, spacing, type } from '../theme';
import { RouteStops } from './RouteStops';

type Props = {
  offer: Offer;
  /** Seconds left on the offer. Dispatch owns the real clock; this only draws it. */
  secondsLeft: number;
  totalSeconds: number;
};

/**
 * The ten-second decision. Fare first and largest, because that is what the driver is deciding
 * on; pickup distance second, because that is what the fare has to cover.
 */
export function OfferCard({ offer, secondsLeft, totalSeconds }: Props) {
  const remaining = Math.max(0, Math.min(1, secondsLeft / totalSeconds));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.tier}>
          <Ionicons name="car-sport" size={15} color={colors.primary} />
          <Text style={styles.tierLabel}>{offer.tier}</Text>
          {offer.surge ? (
            <View style={styles.surge}>
              <Text style={styles.surgeLabel}>{offer.surge}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.countdown}>{secondsLeft}s</Text>
      </View>

      {/* A bar, not a ring: it reads at a glance from a phone mount and costs no animation library. */}
      <View style={styles.track}>
        <View style={[styles.fill, { flex: remaining }]} />
        <View style={{ flex: 1 - remaining }} />
      </View>

      <Text style={styles.fare}>{offer.fare}</Text>
      <Text style={styles.fareNote}>
        {offer.tripDistance} · {offer.tripDuration} trip · {offer.payment}
      </Text>

      <View style={styles.pickupRow}>
        <Ionicons name="walk" size={15} color={colors.textMuted} />
        <Text style={styles.pickupNote}>{offer.pickupDetail} to pickup</Text>
      </View>

      <RouteStops
        pickup={{ name: offer.pickup, detail: offer.pickupEta + ' away' }}
        dropoff={{ name: offer.dropoff, detail: offer.dropoffDetail }}
        style={styles.stops}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierLabel: {
    ...type.label,
    color: colors.text,
  },
  surge: {
    backgroundColor: colors.amberSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  surgeLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.warning,
  },
  countdown: {
    ...type.button,
    color: colors.primary,
  },
  track: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  fill: {
    backgroundColor: colors.primary,
  },
  fare: {
    ...type.hero,
    color: colors.text,
  },
  fareNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  pickupNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  stops: {
    marginTop: spacing.lg,
  },
});
