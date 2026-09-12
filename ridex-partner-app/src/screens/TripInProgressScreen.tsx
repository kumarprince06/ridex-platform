import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { completeTrip, useTrip } from '../api/driver';
import { ApiError } from '../api/problem';
import { MapCanvas } from '../components/MapCanvas';
import { SwipeAction } from '../components/SwipeAction';
import { money } from '../lib/format';
import { trackTripDistance } from '../lib/tripDistance';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'TripInProgress'>;

/**
 * Ride request state TRIP_STARTED. Deliberately the sparsest screen in the app: the driver is
 * driving, so it carries an ETA, a destination, one safety button and one swipe.
 *
 * The fare shown is the rider's quote. The device displays fare, it never decides it - the server
 * prices the trip from the distance actually driven when it ends.
 */
export function TripInProgressScreen({ navigation, route }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const trip = useTrip(route.params?.tripId);
  const destination = trip?.destinationAddress ?? 'the destination';

  // Started on mount, not on the swipe: the distance is everything between the two.
  const distance = useRef<ReturnType<typeof trackTripDistance> | null>(null);
  useEffect(() => {
    distance.current = trackTripDistance();
    return () => {
      distance.current?.stop();
      distance.current = null;
    };
  }, []);

  async function onComplete() {
    const tripId = route.params?.tripId;
    if (!tripId) {
      navigation.replace('TripCompleted', {});
      return;
    }

    setBusy(true);
    setError(null);
    try {
      // What the phone actually measured between pickup and here. Zero means the device never
      // gave a usable fix; the server falls back to the quoted route rather than pricing at zero.
      const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
      const metres = distance.current?.metres() ?? 0;
      const completed = await completeTrip(tripId, metres, Math.max(60, durationSeconds));
      navigation.replace('TripCompleted', {
        tripId,
        fareMinor: completed.finalFareMinor ?? undefined,
        currency: completed.currency,
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not complete the trip.');
    } finally {
      setBusy(false);
    }
  }

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setProgress((prev) => Math.min(1, prev + 0.04)), 1000);
    return () => clearInterval(timer);
  }, []);

  const minutesLeft = Math.max(1, Math.round(19 * (1 - progress)));

  return (
    <View style={styles.root}>
      <MapCanvas showRoute driverAt={progress} driverLabel="You" destinationLabel={destination} />

      <SafeAreaView style={styles.top} edges={['top']} pointerEvents="box-none">
        <View style={styles.etaCard}>
          <Text style={styles.etaValue}>{minutesLeft} min</Text>
          <Text style={styles.etaLabel}>to {destination}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Safety options"
          onPress={() => navigation.navigate('Safety', { riderName: trip?.riderName })}
          style={styles.safety}
        >
          <Ionicons name="shield-checkmark" size={20} color={colors.danger} />
        </Pressable>
      </SafeAreaView>

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.grabber} />

        <View style={styles.fareRow}>
          <View>
            <Text style={styles.fareLabel}>TRIP FARE</Text>
            {/* The quote, not a running meter: the server prices the trip when it ends. */}
            <Text style={styles.fare}>
              {trip ? money(trip.quotedFareMinor, trip.currency) : '--'}
            </Text>
          </View>
          <View style={styles.paymentPill}>
            <Ionicons name="card" size={14} color={colors.textMuted} />
            <Text style={styles.payment}>
              {trip?.paymentMethod === 'CASH' ? 'Cash at drop-off' : 'Paid online'}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <SwipeAction
          label={busy ? 'Completing...' : 'Swipe to complete trip'}
          icon="checkmark"
          onComplete={() => void onComplete()}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: {
    ...type.body,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  etaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  etaValue: {
    ...type.title,
    fontSize: 26,
    color: colors.text,
  },
  etaLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  safety: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    marginTop: 'auto',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareLabel: {
    ...type.eyebrow,
    color: colors.textFaint,
  },
  fare: {
    ...type.title,
    color: colors.text,
    marginTop: 2,
  },
  paymentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  payment: {
    ...type.caption,
    color: colors.textMuted,
  },
});
