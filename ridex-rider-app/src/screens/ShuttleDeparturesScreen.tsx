import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  listDepartures,
  listRoutes,
  runsOn,
  toServiceDate,
  type Departure,
} from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { Chip } from '../components/Chip';
import { Select } from '../components/Select';
import { BrandLoader } from '../components/BrandLoader';
import { Screen, ScreenTitle } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'ShuttleDepartures'>;

/** Today plus the next six days. Nobody books a commuter shuttle three months out. */
const DAYS = 7;

export function ShuttleDeparturesScreen({ navigation, route }: Props) {
  const { routeId } = route.params;

  const routes = useQuery(listRoutes, []);
  const departures = useQuery(() => listDepartures(routeId), [routeId]);

  const shuttleRoute = (routes.data ?? []).find((candidate) => candidate.id === routeId);
  const stops = shuttleRoute?.stops ?? [];

  const [dayOffset, setDayOffset] = useState(0);
  const [boardingId, setBoardingId] = useState<string | null>(null);
  const [alightingId, setAlightingId] = useState<string | null>(null);

  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const serviceDate = toServiceDate(date);

  const boarding = stops.find((stop) => stop.id === boardingId) ?? stops[0];
  // Anything after where they get on. The route runs one way, so the rest is not a shorter trip.
  const alightingOptions = stops.filter((stop) => stop.sequence > (boarding?.sequence ?? 0));
  const alighting =
    alightingOptions.find((stop) => stop.id === alightingId) ??
    alightingOptions[alightingOptions.length - 1];

  // A schedule that does not run on the chosen day is not a departure the rider can take.
  const running = (departures.data ?? []).filter((departure) => runsOn(departure.daysOfWeek, date));

  // Nothing below is meaningful until both loads land, so hold the whole screen rather than
  // wedging a loader between the pickers.
  if (routes.loading || departures.loading) {
    return (
      <Screen onBack={() => navigation.goBack()} title={shuttleRoute?.code ?? 'Shuttle'}>
        <BrandLoader size={72} label="Loading departures" style={styles.spinner} />
      </Screen>
    );
  }

  return (
    <Screen onBack={() => navigation.goBack()} title={shuttleRoute?.code ?? 'Shuttle'}>
      <ScreenTitle
        small
        title={shuttleRoute?.name ?? 'Departures'}
        subtitle="Pick where you get on and off, then a departure."
      />

      <Text style={styles.label}>DAY</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Without this the row claims every spare pixel of the screen it is scrolled inside.
        style={styles.daysRow}
        contentContainerStyle={styles.days}
      >
        {Array.from({ length: DAYS }, (_, offset) => {
          const day = new Date();
          day.setDate(day.getDate() + offset);
          return (
            <Chip
              key={offset}
              label={
                offset === 0
                  ? 'Today'
                  : offset === 1
                    ? 'Tomorrow'
                    : day.toLocaleDateString([], { weekday: 'short', day: 'numeric' })
              }
              selected={dayOffset === offset}
              onPress={() => setDayOffset(offset)}
            />
          );
        })}
      </ScrollView>

      <Select
        label="GET ON AT"
        options={stops.slice(0, -1).map((stop) => ({ id: stop.id, label: stop.name }))}
        selectedId={boarding?.id ?? null}
        onSelect={(id) => {
          setBoardingId(id);
          // Cleared, not kept: the old destination may now be behind the new boarding stop.
          setAlightingId(null);
        }}
      />

      <Select
        label="GET OFF AT"
        options={alightingOptions.map((stop) => ({
          id: stop.id,
          label: stop.name,
          note: `+${stop.offsetMinutes - (boarding?.offsetMinutes ?? 0)}m`,
        }))}
        selectedId={alighting?.id ?? null}
        onSelect={setAlightingId}
      />

      <Text style={styles.label}>DEPARTURES</Text>
      {running.length === 0 && !departures.loading ? (
        <Text style={styles.empty}>Nothing runs on this day.</Text>
      ) : null}

      {running.map((departure) => (
        <DepartureRow
          key={departure.scheduleId}
          departure={departure}
          date={date}
          boardingOffset={boarding?.offsetMinutes ?? 0}
          disabled={!boarding || !alighting}
          onPress={() =>
            boarding &&
            alighting &&
            navigation.navigate('ShuttleSeats', {
              routeId,
              scheduleId: departure.scheduleId,
              serviceDate,
              boardingStopId: boarding.id,
              alightingStopId: alighting.id,
            })
          }
        />
      ))}
    </Screen>
  );
}

function DepartureRow({
  departure,
  date,
  boardingOffset,
  disabled,
  onPress,
}: {
  departure: Departure;
  date: Date;
  boardingOffset: number;
  disabled: boolean;
  onPress: () => void;
}) {
  // The departure time is when the shuttle leaves stop one. What this rider cares about is when it
  // reaches theirs, which is that time plus their stop's offset.
  const [hours, minutes] = departure.departureTime.split(':').map(Number);
  const atStop = new Date(date);
  atStop.setHours(hours ?? 0, (minutes ?? 0) + boardingOffset, 0, 0);

  // A shuttle that has already gone is still on the timetable, so it is shown and refused rather
  // than hidden - a rider who looked for the 17:30 should see what happened to it.
  const departed = atStop.getTime() <= Date.now();
  const blocked = disabled || departed;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, blocked && styles.rowDisabled]}
    >
      <View style={styles.time}>
        <Text style={styles.timeValue}>
          {atStop.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </Text>
        <Text style={styles.timeNote}>at your stop</Text>
      </View>

      <View style={styles.flex}>
        <Text style={styles.rowTitle}>
          {departed ? 'Already departed' : `Departs ${departure.departureTime.slice(0, 5)}`}
        </Text>
        {/* The plate is what a rider actually looks for at the kerb. */}
        <Text style={styles.rowNote} numberOfLines={1}>
          {departure.crew ? `${departure.crew.vehicle} · ${departure.crew.registrationNumber}` : `${departure.seatCapacity} seats`}
        </Text>
      </View>

      {departed ? (
        <Text style={styles.gone}>Gone</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  spinner: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  label: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  daysRow: {
    flexGrow: 0,
  },
  days: {
    flexDirection: 'row',
    gap: spacing.sm,
    // Scrolls sideways: seven wrapped chips pushed the departures below the fold. Centred, or a
    // horizontal scroller stretches every chip to the tallest thing in the row.
    alignItems: 'center',
    paddingRight: spacing.xl,
  },
  gone: {
    ...type.caption,
    color: colors.textFaint,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  time: { alignItems: 'flex-start', minWidth: 84 },
  timeValue: {
    ...type.button,
    fontSize: 18,
    color: colors.primary,
  },
  timeNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  rowTitle: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  rowNote: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
});
