import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { Manifest, Passenger, StopManifest, boardPassenger, departureManifest } from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ShuttleRunPanel } from '../components/ShuttleRunPanel';
import { TextField } from '../components/TextField';
import { clockTime } from '../lib/format';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'ShuttleDeparture'>;

const CODE_LENGTH = 6;

/** One departure: the live run controls, then the manifest grouped by stop, and check-in. */
export function ShuttleDepartureScreen({ navigation, route }: Props) {
  const { shuttleTripId } = route.params;
  const { data, loading, error, refetch } = useQuery(() => departureManifest(shuttleTripId), [shuttleTripId]);

  // Boarding returns the refreshed manifest, so we show that instead of refetching.
  const [boarded, setBoarded] = useState<Manifest | null>(null);
  const [checkingIn, setCheckingIn] = useState<Passenger | null>(null);

  const manifest = boarded ?? data;

  return (
    // Cleared once the reload lands, so the fresh manifest wins without flashing the pre-boarding one.
    <Screen onRefresh={() => refetch().then(() => setBoarded(null))}
      title="Departure"
      onBack={() => (checkingIn ? setCheckingIn(null) : navigation.goBack())}
    >
      {loading ? <Text style={styles.note}>Loading the manifest...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {manifest && checkingIn ? (
        <CheckIn
          passenger={checkingIn}
          onCancel={() => setCheckingIn(null)}
          onScan={(onScanned) => navigation.navigate('ScanPickup', { onScanned })}
          onBoard={(code) =>
            boardPassenger(shuttleTripId, checkingIn.bookingId, code).then((next) => {
              setBoarded(next);
              setCheckingIn(null);
            })
          }
        />
      ) : null}

      {manifest && !checkingIn ? (
        <>
          <ShuttleRunPanel shuttleTripId={shuttleTripId} />

          <View style={styles.head}>
            <Text style={styles.route}>{manifest.routeName}</Text>
            <Text style={styles.meta}>
              {clockTime(manifest.departsAt)} · {manifest.seatsSold} of {manifest.seatCapacity} seats
              sold
            </Text>
          </View>

          {manifest.stops.map((stop) => (
            <Stop key={stop.stopId} stop={stop} onCheckIn={setCheckingIn} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function Stop({
  stop,
  onCheckIn,
}: {
  stop: StopManifest;
  onCheckIn: (passenger: Passenger) => void;
}) {
  return (
    <View style={styles.stop}>
      <View style={styles.stopHead}>
        <Text style={styles.stopName}>
          {stop.sequence}. {stop.name}
        </Text>
        <Text style={styles.stopMeta}>+{stop.offsetMinutes} min</Text>
      </View>

      <Text style={styles.stopCounts}>
        {stop.boardingCount} on · {stop.alightingCount} off · {stop.onBoardAfter} on board after
      </Text>

      {stop.boarding.map((passenger) => (
        <Pressable
          key={passenger.bookingId}
          accessibilityRole="button"
          // Already boarded - no second check-in.
          disabled={passenger.boarded}
          onPress={() => onCheckIn(passenger)}
          style={({ pressed }) => [styles.passenger, pressed && styles.pressed]}
        >
          <View style={styles.seatTile}>
            <Text style={styles.seat}>{passenger.seatLabel}</Text>
          </View>

          <View style={styles.passengerBody}>
            <Text style={styles.passengerName}>{passenger.riderName}</Text>
            <Text style={styles.passengerMeta}>off at {passenger.alightingStopName}</Text>
          </View>

          {passenger.boarded ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.online} />
          ) : (
            <Ionicons name="qr-code-outline" size={18} color={colors.textFaint} />
          )}
        </Pressable>
      ))}

      {stop.alighting.length ? (
        <Text style={styles.alighting}>
          Getting off here: {stop.alighting.map((passenger) => passenger.seatLabel).join(', ')}
        </Text>
      ) : null}
    </View>
  );
}

/** Check-in for one seat: scan the QR, or type the six digits. The server checks the code. */
function CheckIn({
  passenger,
  onBoard,
  onCancel,
  onScan,
}: {
  passenger: Passenger;
  onBoard: (code: string) => Promise<void>;
  onCancel: () => void;
  onScan: (onScanned: (value: string) => void) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(value: string) {
    setBusy(true);
    setError(null);
    try {
      await onBoard(value);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not board that passenger.');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.checkIn}>
      <Text style={styles.checkInTitle}>
        Seat {passenger.seatLabel} · {passenger.riderName}
      </Text>
      <Text style={styles.checkInBody}>
        Scan the passenger's QR, or type the six digits they show you.
      </Text>

      <Button
        label="Scan QR"
        variant="secondary"
        onPress={() =>
          onScan((value) => {
            setCode(value);
            void submit(value);
          })
        }
      />

      <TextField
        label="Boarding code"
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        keyboardType="number-pad"
        icon="keypad-outline"
        error={error ?? undefined}
      />

      <Button
        label={busy ? 'Boarding...' : 'Board passenger'}
        onPress={() => void submit(code)}
        disabled={busy || code.length !== CODE_LENGTH}
      />
      <Button label="Cancel" variant="secondary" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    ...type.body,
    color: colors.textMuted,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
  head: {
    marginBottom: spacing.md,
  },
  route: {
    ...type.title,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  stop: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  stopHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopName: {
    ...type.body,
    color: colors.text,
  },
  stopMeta: {
    ...type.caption,
    color: colors.textMuted,
  },
  stopCounts: {
    ...type.caption,
    color: colors.textFaint,
  },
  passenger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  seatTile: {
    minWidth: 38,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingVertical: 6,
  },
  seat: {
    ...type.caption,
    color: colors.primary,
  },
  passengerBody: {
    flex: 1,
  },
  passengerName: {
    ...type.body,
    color: colors.text,
  },
  passengerMeta: {
    ...type.caption,
    color: colors.textMuted,
  },
  alighting: {
    ...type.caption,
    color: colors.textMuted,
  },
  checkIn: {
    gap: spacing.md,
  },
  checkInTitle: {
    ...type.title,
    color: colors.text,
  },
  checkInBody: {
    ...type.body,
    color: colors.textMuted,
  },
});
