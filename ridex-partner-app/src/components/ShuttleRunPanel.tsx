import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import {
  arriveAtStop,
  departureLive,
  finishRun,
  reportRunLocation,
  startRun,
  type ShuttleLive,
} from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { clockTime } from '../lib/format';
import { useLivePosition } from '../lib/location';
import { colors, radius, spacing, type } from '../theme';
import { Button } from './Button';

const PING_EVERY_MS = 8000;

/** Start / arrived / finish for a shuttle run, and the GPS pings that move it along. */
export function ShuttleRunPanel({ shuttleTripId }: { shuttleTripId: string }) {
  const { data } = useQuery(() => departureLive(shuttleTripId), [shuttleTripId]);
  const [live, setLive] = useState<ShuttleLive | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = live ?? data;
  const running = state?.status === 'RUNNING';
  const next = state?.stops?.find((stop) => stop.state === 'UPCOMING') ?? null;

  // Pings while the run is on. The server decides when a stop is reached.
  const { position, heading } = useLivePosition(running);
  const lastSent = useRef(0);
  useEffect(() => {
    if (!running || !position || Date.now() - lastSent.current < PING_EVERY_MS) {
      return;
    }
    lastSent.current = Date.now();
    reportRunLocation(shuttleTripId, position[1], position[0], heading)
      .then(setLive)
      .catch(() => undefined);
  }, [running, position, heading, shuttleTripId]);

  async function act(action: () => Promise<ShuttleLive>) {
    setBusy(true);
    setError(null);
    try {
      setLive(await action());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    if (!next) {
      void act(() => finishRun(shuttleTripId));
      return;
    }
    Alert.alert('Finish the run?', `${next.name} and later stops haven't been reached yet.`, [
      { text: 'Keep driving', style: 'cancel' },
      { text: 'Finish', style: 'destructive', onPress: () => void act(() => finishRun(shuttleTripId)) },
    ]);
  }

  if (!state?.status) {
    return null;
  }

  return (
    <View style={styles.card}>
      {state.status === 'SCHEDULED' ? (
        <>
          <Text style={styles.title}>Ready when you are</Text>
          <Text style={styles.note}>Riders are told the moment you start, and can follow you live.</Text>
          <Button label="Start run" loading={busy} disabled={busy} onPress={() => void act(() => startRun(shuttleTripId))} />
        </>
      ) : null}

      {running ? (
        <>
          <View style={styles.row}>
            <View style={styles.liveDot} />
            <Text style={styles.live}>LIVE</Text>
            {state.delayMinutes > 0 ? <Text style={styles.late}>{state.delayMinutes} min late</Text> : null}
          </View>
          {next ? (
            <>
              <Text style={styles.title}>Next stop: {next.name}</Text>
              <Text style={styles.note}>
                Expected {next.expectedAt ? clockTime(next.expectedAt) : clockTime(next.scheduledAt)} · marked
                automatically when you get there
              </Text>
              <Button
                label={`Arrived at ${next.name}`}
                variant="secondary"
                loading={busy}
                disabled={busy}
                onPress={() => void act(() => arriveAtStop(shuttleTripId, next.id))}
              />
            </>
          ) : (
            <Text style={styles.title}>All stops reached</Text>
          )}
          <Button label="Finish run" variant={next ? 'secondary' : 'primary'} disabled={busy} onPress={finish} />
        </>
      ) : null}

      {state.status === 'COMPLETED' ? (
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.title}>Run finished</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  live: {
    ...type.eyebrow,
    color: colors.danger,
  },
  late: {
    ...type.caption,
    color: colors.warning,
    marginLeft: 'auto',
  },
  title: {
    ...type.button,
    fontSize: 17,
    color: colors.text,
  },
  note: {
    ...type.caption,
    color: colors.textMuted,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
});
