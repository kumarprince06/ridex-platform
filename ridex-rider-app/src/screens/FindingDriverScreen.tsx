import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MapCanvas } from '../components/MapCanvas';
import { Sheet } from '../components/Sheet';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FindingDriver'>;

const MATCH_DELAY_MS = 3200;
const FOUND_HOLD_MS = 1300;

export function FindingDriverScreen({ navigation, route }: Props) {
  const { destination } = route.params;
  // Searching and found are the same screen: same map, same sheet, same cancel affordance. Only
  // the badge and the copy change, so this is a state rather than a second route.
  const [found, setFound] = useState(false);

  useEffect(() => {
    // Stands in for the dispatch round trip.
    const timer = setTimeout(() => setFound(true), MATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!found) {
      return;
    }
    // Holds the confirmation long enough to read, then replaces so Cancel cannot land the user
    // back on a search that has already been matched.
    const timer = setTimeout(
      () => navigation.replace('DriverAssigned', { destination }),
      FOUND_HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [found, navigation, destination]);

  return (
    <View style={styles.root}>
      <MapCanvas showUserDot />

      <Sheet>
        <View style={[styles.pulse, found && styles.pulseFound]}>
          <View style={[styles.pulseInner, found && styles.pulseInnerFound]}>
            <Ionicons
              name={found ? 'checkmark' : 'search'}
              size={found ? 30 : 26}
              color={colors.onPrimary}
            />
          </View>
        </View>

        <Text style={styles.title}>{found ? 'Driver Found!' : 'Finding your driver...'}</Text>

        {found ? null : (
          <>
            <Text style={styles.subtitle}>Matching with nearby drivers</Text>

            {/* Skeleton driver cards - placeholders for the candidates being polled. */}
            <View style={styles.skeletons}>
              {[0, 1, 2].map((index) => (
                <View key={index} style={styles.skeleton}>
                  <View style={styles.skeletonAvatar} />
                  <View style={styles.skeletonLine} />
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable
          onPress={() => navigation.navigate('CancelRide')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>Cancel Request</Text>
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
  pulse: {
    alignSelf: 'center',
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Success shifts to a deeper green, distinct from the brand mint used while searching.
  pulseFound: {
    backgroundColor: 'rgba(35, 197, 130, 0.16)',
  },
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
