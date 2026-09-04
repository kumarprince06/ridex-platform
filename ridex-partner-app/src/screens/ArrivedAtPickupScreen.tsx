import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { startTrip } from '../api/driver';
import { ApiError } from '../api/problem';
import { MapCanvas } from '../components/MapCanvas';
import { RiderBar } from '../components/RiderBar';
import { SwipeAction } from '../components/SwipeAction';
import { TextField } from '../components/TextField';
import { OFFER } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'ArrivedAtPickup'>;

// Six, matching the code the server issues and the rider's screen shows.
const CODE_LENGTH = 6;

/**
 * Ride request state DRIVER_AT_PICKUP. The waiting timer starts here because the cancellation fee
 * depends on it - the server owns the authoritative clock, this only mirrors it.
 */
export function ArrivedAtPickupScreen({ navigation, route }: Props) {
  const [waited, setWaited] = useState(0);
  const [code, setCode] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setWaited((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = String(Math.floor(waited / 60)).padStart(2, '0');
  const seconds = String(waited % 60).padStart(2, '0');
  // Either path verifies: the QR the rider's app shows, or the code they read out.
  const verified = scannedCode !== null || code.length === CODE_LENGTH;

  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!verified) {
      setError("Scan the rider's QR or enter their 6-digit code first.");
      return;
    }

    const tripId = route.params?.tripId;
    if (!tripId) {
      navigation.replace('TripInProgress', {});
      return;
    }

    setBusy(true);
    setError(null);
    try {
      // Whichever way it was captured, it is the same secret and the same check. The server
      // decides it matches - a phone that decided would let a driver start a trip nobody boarded.
      await startTrip(tripId, scannedCode ?? code);
      navigation.replace('TripInProgress', { tripId });
    } catch (caught) {
      // Wrong code, or five wrong ones and the code is burned. Both say so plainly.
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not start the trip.');
      setScannedCode(null);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

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

        {scannedCode ? (
          <View style={styles.verified}>
            <Ionicons name="qr-code" size={17} color={colors.success} />
            <Text style={styles.verifiedText}>Rider confirmed by QR</Text>
          </View>
        ) : (
          <>
            <Button
              label="Scan rider's QR"
              variant="secondary"
              onPress={() =>
                navigation.navigate('ScanPickup', {
                  onScanned: (value: string) => {
                    setScannedCode(value);
                    setError(null);
                  },
                })
              }
            />

            <View style={styles.orRow}>
              <View style={styles.rule} />
              <Text style={styles.orLabel}>OR</Text>
              <View style={styles.rule} />
            </View>

            <TextField
              label={`Pickup code (${CODE_LENGTH} digits)`}
              value={code}
              onChangeText={(next) => {
                setCode(next.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH));
                setError(null);
              }}
              placeholder="Any 4 digits in this build"
              keyboardType="number-pad"
              icon="keypad"
            />
          </>
        )}

        <SwipeAction
          label={busy ? 'Starting...' : 'Swipe to start trip'}
          icon="play"
          onComplete={() => void start()}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

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
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSurface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  verifiedText: {
    ...type.label,
    color: colors.success,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: -spacing.sm,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.textFaint,
  },
  error: {
    ...type.caption,
    color: colors.danger,
    textAlign: 'center',
    marginTop: -spacing.sm,
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
