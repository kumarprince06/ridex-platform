import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { cancelRide } from '../api/rides';
import { useRideStatus } from '../api/rideStatus';
import { MapCanvas } from '../components/MapCanvas';
import { PulseRings } from '../components/PulseRings';
import { SCREEN_FOR } from '../lib/journey';
import { Sheet } from '../components/Sheet';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FindingDriver'>;

// Long enough to read the confirmation before the screen changes under the rider.
const FOUND_HOLD_MS = 1300;

// One full pass of the three skeletons, so each lifts for a third of it.
const SKELETON_CYCLE_MS = 1500;
const SKELETONS = [0, 1, 2];

export function FindingDriverScreen({ navigation, route }: Props) {
  const { destination, rideId } = route.params;
  const { ride } = useRideStatus(rideId ?? null);

  // Searching and found are the same screen: same map, same sheet, same cancel affordance. Only
  // the badge and the copy change, so this is a state rather than a second route.
  // Any post-assignment status counts: a quick driver can be at the pickup before the next poll.
  const next = ride ? SCREEN_FOR[ride.status] : undefined;
  const found = next != null;
  const [gaveUp, setGaveUp] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const skeletonClock = useRef(new Animated.Value(0)).current;
  const searching = !found && !gaveUp;

  useEffect(() => {
    // Same trick as PulseRings: one clock, each card a third of a cycle behind the last.
    if (!searching) {
      skeletonClock.stopAnimation();
      skeletonClock.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(skeletonClock, {
        toValue: 1,
        duration: SKELETON_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [searching, skeletonClock]);

  useEffect(() => {
    if (!next) {
      return;
    }
    const timer = setTimeout(
      () => navigation.replace(next, { destination, rideId }),
      FOUND_HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [next, navigation, destination, rideId]);

  useEffect(() => {
    // The server gives up after four widening waves. Saying so beats a spinner that never stops.
    if (ride?.status === 'EXPIRED' || ride?.status === 'CANCELLED_BY_SYSTEM') {
      setGaveUp(true);
    } else if (ride?.status === 'CANCELLED_BY_DRIVER' || ride?.status === 'CANCELLED_BY_RIDER') {
      navigation.replace('RideCancelled', { rideId });
    }
  }, [ride?.status, navigation, rideId]);

  async function onCancel() {
    if (!rideId) {
      navigation.goBack();
      return;
    }
    // Stays put on failure: leaving would hide a search that is still live and may still match.
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelRide(rideId, 'PLANS_CHANGED');
      navigation.goBack();
    } catch (caught) {
      setCancelError(caught instanceof ApiError ? caught.userMessage : 'Could not cancel the request.');
      setCancelling(false);
    }
  }

  return (
    <View style={styles.root}>
      <MapCanvas showUserDot />

      <Sheet>
        <PulseRings active={!found} size={84} colour={colors.primary} style={styles.rings}>
          <View style={[styles.pulseInner, found && styles.pulseInnerFound]}>
            <Ionicons
              name={found ? 'checkmark' : 'search'}
              size={found ? 30 : 26}
              color={colors.onPrimary}
            />
          </View>
        </PulseRings>

        <Text style={styles.title}>
          {gaveUp
            ? 'No drivers available'
            : found
              ? 'Driver Found!'
              : 'Finding your driver...'}
        </Text>

        {found ? null : (
          <>
            <Text style={styles.subtitle}>Matching with nearby drivers</Text>

            {/* Skeleton driver cards - placeholders for the candidates being polled. */}
            <View style={styles.skeletons}>
              {SKELETONS.map((index) => {
                const progress = Animated.modulo(
                  Animated.add(skeletonClock, index / SKELETONS.length),
                  1,
                );
                // A short lift and brighten near the start of each card's slot, flat the rest.
                const inputRange = [0, 0.12, 0.28, 0.4, 1];

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.skeleton,
                      {
                        opacity: progress.interpolate({
                          inputRange,
                          outputRange: [0.45, 1, 1, 0.45, 0.45],
                        }),
                        transform: [
                          {
                            translateY: progress.interpolate({
                              inputRange,
                              outputRange: [0, -6, -6, 0, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.skeletonAvatar} />
                    <View style={styles.skeletonLine} />
                  </Animated.View>
                );
              })}
            </View>
          </>
        )}

        {cancelError ? <Text style={styles.cancelError}>{cancelError}</Text> : null}

        <Pressable
          onPress={gaveUp ? () => navigation.goBack() : onCancel}
          disabled={cancelling}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>{gaveUp ? 'Try again' : cancelling ? 'Cancelling...' : 'Cancel Request'}</Text>
        </Pressable>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  rings: {
    marginBottom: spacing.sm,
  },
  // Success shifts to a deeper green, distinct from the brand mint used while searching.
  pulseInner: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInnerFound: {
    backgroundColor: '#23C582',
  },
  title: {
    ...type.title,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  subtitle: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  skeletons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.xl,
  },
  skeleton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  skeletonLine: {
    width: 54,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
  },
  cancel: {
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  cancelError: {
    ...type.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cancelText: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
});
