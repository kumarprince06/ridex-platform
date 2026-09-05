import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { cancelRide } from '../api/rides';
import { useRideStatus } from '../api/rideStatus';
import { MapCanvas } from '../components/MapCanvas';
import { PulseRings } from '../components/PulseRings';
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
  const found = ride?.status === 'DRIVER_ASSIGNED';
  const [gaveUp, setGaveUp] = useState(false);
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
    if (!found) {
      return;
    }
    const timer = setTimeout(
      () => navigation.replace('DriverAssigned', { destination, rideId }),
      FOUND_HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [found, navigation, destination, rideId]);

  useEffect(() => {
    // The server gives up after four widening waves. Saying so beats a spinner that never stops.
    if (ride?.status === 'EXPIRED' || ride?.status === 'CANCELLED_BY_SYSTEM') {
      setGaveUp(true);
    }
  }, [ride?.status]);

  async function onCancel() {
    if (rideId) {
      // Best effort: a failed cancel must not trap the rider on this screen.
      await cancelRide(rideId, 'Cancelled while searching').catch(() => undefined);
    }
    navigation.goBack();
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

        <Pressable
          onPress={gaveUp ? () => navigation.goBack() : onCancel}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>{gaveUp ? 'Try again' : 'Cancel Request'}</Text>
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
  cancelText: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
});
