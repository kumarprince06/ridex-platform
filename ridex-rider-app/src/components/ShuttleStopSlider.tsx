import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { LiveStop } from '../api/shuttleLive';
import { clockTime } from '../lib/format';
import { colors, radius, spacing, type } from '../theme';

const CARD = 148;
const GAP = 10;

type Props = { stops: LiveStop[]; boardingSequence: number; alightingSequence: number };

/** Every stop as a card with its live time, scrolled to wherever the shuttle is. */
export function ShuttleStopSlider({ stops, boardingSequence, alightingSequence }: Props) {
  const list = useRef<FlatList<LiveStop>>(null);
  const focus = Math.max(0, stops.findIndex((stop) => stop.state !== 'PASSED'));

  useEffect(() => {
    if (stops.length > 0) {
      list.current?.scrollToIndex({ index: Math.max(0, focus - 1), animated: true });
    }
  }, [focus, stops.length]);

  return (
    <FlatList
      ref={list}
      horizontal
      data={stops}
      keyExtractor={(stop) => stop.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      getItemLayout={(_, index) => ({ length: CARD + GAP, offset: (CARD + GAP) * index, index })}
      renderItem={({ item }) => (
        <StopCard
          stop={item}
          tag={item.sequence === boardingSequence ? 'Board here' : item.sequence === alightingSequence ? 'Get off' : null}
        />
      )}
    />
  );
}

function StopCard({ stop, tag }: { stop: LiveStop; tag: string | null }) {
  const passed = stop.state === 'PASSED';
  const current = stop.state === 'CURRENT';
  const actual = stop.arrivedAt ?? stop.expectedAt;
  const time = stop.arrivedAt
    ? `Reached ${clockTime(stop.arrivedAt)}`
    : stop.expectedAt
      ? `ETA ${clockTime(stop.expectedAt)}`
      : clockTime(stop.scheduledAt);
  // Over a minute behind the timetable reads as late.
  const late = actual != null && new Date(actual).getTime() - new Date(stop.scheduledAt).getTime() > 60000;

  return (
    <View style={[styles.card, current && styles.cardCurrent, passed && styles.cardPassed]}>
      <View style={styles.top}>
        <View style={[styles.badge, passed && styles.badgePassed, current && styles.badgeCurrent]}>
          <Ionicons
            name={passed ? 'checkmark' : current ? 'bus' : 'ellipse-outline'}
            size={12}
            color={passed || current ? colors.onPrimary : colors.textMuted}
          />
        </View>
        <Text style={styles.sequence}>Stop {stop.sequence}</Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {stop.name}
      </Text>
      <Text style={[styles.time, late && styles.timeLate, current && styles.timeCurrent]}>
        {current ? 'Shuttle is here' : time}
      </Text>
      {actual ? <Text style={styles.scheduled}>Scheduled {clockTime(stop.scheduledAt)}</Text> : null}
      {tag ? <Text style={styles.tag}>{tag}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: GAP,
    paddingVertical: spacing.xs,
  },
  card: {
    width: CARD,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  cardCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  cardPassed: {
    opacity: 0.6,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePassed: {
    backgroundColor: colors.primaryMuted,
  },
  badgeCurrent: {
    backgroundColor: colors.primary,
  },
  sequence: {
    ...type.caption,
    color: colors.textFaint,
  },
  name: {
    ...type.button,
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
    minHeight: 36,
  },
  time: {
    ...type.caption,
    color: colors.textMuted,
  },
  timeLate: {
    color: colors.amber,
  },
  scheduled: {
    ...type.caption,
    fontSize: 11,
    color: colors.textFaint,
  },
  timeCurrent: {
    color: colors.primary,
  },
  tag: {
    ...type.caption,
    color: colors.amber,
  },
});
