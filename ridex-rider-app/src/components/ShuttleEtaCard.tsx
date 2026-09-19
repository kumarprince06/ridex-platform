import { StyleSheet, Text, View } from 'react-native';

import type { ShuttleLive } from '../api/shuttleLive';
import { colors, radius, spacing, type } from '../theme';

type Props = { trip: ShuttleLive; boardingSequence: number; alightingSequence: number; connected: boolean };

/** The one line a waiting rider looks for: how long until the shuttle reaches them. */
export function ShuttleEtaCard({ trip, boardingSequence, alightingSequence, connected }: Props) {
  const { title, subtitle } = summary(trip, boardingSequence, alightingSequence);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {trip.status === 'RUNNING' ? (
          <View style={styles.live}>
            <View style={[styles.dot, !connected && styles.dotOff]} />
            <Text style={styles.liveText}>{connected ? 'LIVE' : 'UPDATING'}</Text>
          </View>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {trip.status === 'RUNNING' && trip.delayMinutes > 0 ? (
        <Text style={styles.delay}>Running {trip.delayMinutes} min late</Text>
      ) : null}
    </View>
  );
}

function summary(trip: ShuttleLive, boarding: number, alighting: number): { title: string; subtitle: string | null } {
  if (trip.status === 'SCHEDULED') return { title: 'Not started yet', subtitle: "You'll get a notification when it leaves." };
  if (trip.status === 'COMPLETED') return { title: 'Trip finished', subtitle: null };

  const at = trip.currentStopSequence ?? 0;
  if (at === boarding) {
    return { title: 'At your stop now', subtitle: 'Show your boarding pass to the driver.' };
  }
  const target = at < boarding ? boarding : alighting;
  const stop = trip.stops.find((candidate) => candidate.sequence === target);
  const minutes = stop?.expectedAt
    ? Math.max(1, Math.round((new Date(stop.expectedAt).getTime() - Date.now()) / 60000))
    : null;
  const away = target - at;
  const count = away === 1 ? 'Next stop' : `${away} stops away`;
  const when = minutes == null ? '' : ` in ${minutes} min`;
  return at < boarding
    ? { title: `Arriving${when}`, subtitle: `${count} · ${stop?.name ?? ''}` }
    : { title: `Drop-off${when}`, subtitle: `${count} · ${stop?.name ?? ''}` };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    padding: spacing.lg,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...type.button,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    flex: 1,
  },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
  },
  delay: {
    ...type.caption,
    color: colors.amber,
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  dotOff: {
    backgroundColor: colors.textFaint,
  },
  liveText: {
    ...type.caption,
    fontSize: 11,
    color: colors.text,
  },
});
