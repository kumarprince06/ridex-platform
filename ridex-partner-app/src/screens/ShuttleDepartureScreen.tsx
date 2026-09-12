import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { Manifest, Passenger, StopManifest, boardPassenger, departureManifest } from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { clockTime } from '../lib/format';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'ShuttleDeparture'>;

// Six, matching the code the server issues and the rider's booking screen shows.
const CODE_LENGTH = 6;

/**
 * One departure's manifest: who gets on where, who gets off where, and check-in.
 *
 * Grouped by stop rather than one passenger list, because that is the question asked at the door -
 * "how many here?" - and counting a flat list at every stop is how somebody gets left standing.
 */
export function ShuttleDepartureScreen({ navigation, route }: Props) {
  const { shuttleTripId } = route.params;
  const { data, loading, error } = useQuery(() => departureManifest(shuttleTripId), [shuttleTripId]);

  // The manifest after a check-in. The board call returns the refreshed one, so the counts move
  // without a second round trip.
  const [boarded, setBoarded] = useState<Manifest | null>(null);
  const [checkingIn, setCheckingIn] = useState<Passenger | null>(null);

  const manifest = boarded ?? data;

  return (
    <Screen
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
          // A boarded seat is done. Tapping it again is how one code gets used twice.
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

/**
 * Check-in for one seat. The QR is the fast path and the six digits are the fallback - a cracked
 * screen or a dead battery ends with the passenger reading the code out.
 *
 * The code is only carried here. Whether it matches is the server's decision: a phone that decided
 * for itself has verified nothing, and a cash seat is settled by that same call.
 */
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
      // "That code does not match this seat" and "already on board" both arrive here, and both
      // are exactly what the driver at the door needs to read.
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
