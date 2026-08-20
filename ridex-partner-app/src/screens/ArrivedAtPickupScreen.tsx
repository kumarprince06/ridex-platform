import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapCanvas } from '../components/MapCanvas';
import { RiderBar } from '../components/RiderBar';
import { SwipeAction } from '../components/SwipeAction';
import { TextField } from '../components/TextField';
import { OFFER } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'ArrivedAtPickup'>;

const CODE_LENGTH = 4;

/**
 * Ride request state DRIVER_AT_PICKUP. The waiting timer starts here because the cancellation fee
 * depends on it - the server owns the authoritative clock, this only mirrors it.
 */
export function ArrivedAtPickupScreen({ navigation }: Props) {
  const [waited, setWaited] = useState(0);
  const [code, setCode] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setWaited((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = String(Math.floor(waited / 60)).padStart(2, '0');
  const seconds = String(waited % 60).padStart(2, '0');
  const verified = code.length === CODE_LENGTH;

  return (
    <View style={styles.root}>
      <MapCanvas driverAt={1} driverLabel="You" pickupLabel={OFFER.pickup} />

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.grabber} />

        <View style={styles.waitRow}>
          <View style={styles.waitBadge}>
            <Ionicons name="time" size={15} color={colors.warning} />
            <Text style={styles.waitValue}>
              {minutes}:{seconds}
            </Text>
          </View>
          <Text style={styles.waitNote}>Waiting at pickup</Text>
        </View>

        <RiderBar name={OFFER.rider} rating={OFFER.riderRating} note="Meeting you outside" />

        <TextField
          label={`Pickup code (${CODE_LENGTH} digits)`}
          value={code}
          onChangeText={(next) => setCode(next.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH))}
          placeholder="0000"
          keyboardType="number-pad"
          icon="keypad"
        />

        <SwipeAction
          label={verified ? 'Swipe to start trip' : 'Enter the code to start'}
          icon="play"
          onComplete={() => (verified ? navigation.replace('TripInProgress') : undefined)}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('CancelTrip')}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Text style={styles.cancelLabel}>Rider is not here</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
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
  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  waitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.amberSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  waitValue: {
    ...type.label,
    color: colors.warning,
  },
  waitNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  cancel: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  cancelLabel: {
    ...type.label,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});
