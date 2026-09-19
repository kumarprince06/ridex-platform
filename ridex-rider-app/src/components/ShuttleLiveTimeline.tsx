import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { LiveStop, ShuttleLive } from '../api/shuttleLive';
import { clockTime } from '../lib/format';
import { colors, radius, spacing, type } from '../theme';

type Props = {
  trip: ShuttleLive;
  boardingSequence: number;
  alightingSequence: number;
  connected: boolean;
};

/** Where the shuttle is on the route, and how far it is from the rider's stop. */
export function ShuttleLiveTimeline({ trip, boardingSequence, alightingSequence, connected }: Props) {
  const headline = headlineFor(trip, boardingSequence, alightingSequence);

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.headline}>{headline}</Text>
        {trip.status === 'RUNNING' ? (
          <View style={styles.liveTag}>
            <View style={[styles.liveDot, !connected && styles.liveDotOff]} />
            <Text style={styles.liveText}>{connected ? 'LIVE' : 'UPDATING'}</Text>
          </View>
        ) : null}
      </View>
      {trip.status === 'RUNNING' && trip.delayMinutes > 0 ? (
        <Text style={styles.delay}>Running {trip.delayMinutes} min late</Text>
      ) : null}

      <View style={styles.stops}>
        {trip.stops.map((stop, index) => (
          <StopRow
            key={stop.id}
            stop={stop}
            last={index === trip.stops.length - 1}
            tag={stop.sequence === boardingSequence ? 'Board here' : stop.sequence === alightingSequence ? 'Get off' : null}
            outside={stop.sequence < boardingSequence || stop.sequence > alightingSequence}
          />
        ))}
      </View>
    </View>
  );
}

function StopRow({ stop, last, tag, outside }: { stop: LiveStop; last: boolean; tag: string | null; outside: boolean }) {
  const passed = stop.state === 'PASSED';
  const current = stop.state === 'CURRENT';
  const time = stop.arrivedAt ?? stop.expectedAt ?? stop.scheduledAt;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.dot, passed && styles.dotPassed, current && styles.dotCurrent]}>
          {passed ? <Ionicons name="checkmark" size={10} color={colors.onPrimary} /> : null}
          {current ? <Ionicons name="bus" size={11} color={colors.onPrimary} /> : null}
        </View>
        {last ? null : <View style={[styles.line, passed && styles.linePassed]} />}
      </View>
      <View style={[styles.stopBody, outside && styles.outside]}>
        <View style={styles.stopTop}>
          <Text style={[styles.stopName, tag && styles.stopNameMine]} numberOfLines={1}>
            {stop.name}
          </Text>
          <Text style={styles.time}>{clockTime(time)}</Text>
        </View>
        {tag ? <Text style={styles.tag}>{tag}</Text> : null}
      </View>
    </View>
  );
}

function headlineFor(trip: ShuttleLive, boarding: number, alighting: number): string {
  if (trip.status === 'SCHEDULED') {
    return 'Not started yet';
  }
  if (trip.status === 'COMPLETED') {
    return 'Trip finished';
  }
  const at = trip.currentStopSequence ?? 0;
  const target = at < boarding ? boarding : alighting;
  const stop = trip.stops.find((candidate) => candidate.sequence === target);
  if (at === boarding) {
    return 'At your stop now';
  }
  const away = target - at;
  const minutes = stop?.expectedAt
    ? Math.max(1, Math.round((new Date(stop.expectedAt).getTime() - Date.now()) / 60000))
    : null;
  const eta = minutes == null ? '' : `in ${minutes} min · `;
  const count = away === 1 ? 'next stop' : `${away} stops away`;
  return at < boarding ? `Arriving ${eta}${count}` : `Your drop-off ${eta}${count}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headline: {
    ...type.button,
    fontSize: 17,
    color: colors.text,
    flex: 1,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  liveDotOff: {
    backgroundColor: colors.textFaint,
  },
  liveText: {
    ...type.caption,
    fontSize: 11,
    color: colors.text,
  },
  delay: {
    ...type.caption,
    color: colors.amber,
    marginTop: 2,
  },
  stops: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textFaint,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPassed: {
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryMuted,
  },
  dotCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: colors.border,
  },
  linePassed: {
    backgroundColor: colors.primaryMuted,
  },
  stopBody: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  outside: {
    opacity: 0.45,
  },
  stopTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stopName: {
    ...type.body,
    color: colors.text,
    flex: 1,
  },
  stopNameMine: {
    ...type.button,
  },
  time: {
    ...type.caption,
    color: colors.textMuted,
  },
  tag: {
    ...type.caption,
    color: colors.primary,
    marginTop: 1,
  },
});
