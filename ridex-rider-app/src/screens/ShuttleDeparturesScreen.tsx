import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  listDepartures,
  listRoutes,
  runsOn,
  toServiceDate,
  type Departure,
} from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { Chip } from '../components/Chip';
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

  return (
    <Screen onBack={() => navigation.goBack()} title={shuttleRoute?.code ?? 'Shuttle'}>
      <ScreenTitle
        title={shuttleRoute?.name ?? 'Departures'}
        subtitle="Pick where you get on and off, then a departure."
      />

      {routes.loading || departures.loading ? (
        <BrandLoader size={72} label="Loading departures" style={styles.spinner} />
      ) : null}

      <Text style={styles.label}>DAY</Text>
      <View style={styles.days}>
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
      </View>

      <Text style={styles.label}>GET ON AT</Text>
      <View style={styles.stops}>
        {stops.slice(0, -1).map((stop) => (
          <Chip
            key={stop.id}
            label={stop.name}
            selected={boarding?.id === stop.id}
            onPress={() => {
              setBoardingId(stop.id);
              // Cleared, not kept: the old destination may now be behind the new boarding stop.
              setAlightingId(null);
            }}
          />
        ))}
      </View>

      <Text style={styles.label}>GET OFF AT</Text>
      <View style={styles.stops}>
        {alightingOptions.map((stop) => (
          <Chip
            key={stop.id}
            label={`${stop.name} · +${stop.offsetMinutes}m`}
            selected={alighting?.id === stop.id}
            onPress={() => setAlightingId(stop.id)}
          />
        ))}
      </View>

      <Text style={styles.label}>DEPARTURES</Text>
      {running.length === 0 && !departures.loading ? (
        <Text style={styles.empty}>Nothing runs on this day.</Text>
      ) : null}

      {running.map((departure) => (
        <DepartureRow
          key={departure.scheduleId}
          departure={departure}
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
  boardingOffset,
  disabled,
  onPress,
}: {
  departure: Departure;
  boardingOffset: number;
  disabled: boolean;
  onPress: () => void;
}) {
  // The departure time is when the shuttle leaves stop one. What this rider cares about is when it
  // reaches theirs, which is that time plus their stop's offset.
  const [hours, minutes] = departure.departureTime.split(':').map(Number);
  const atStop = new Date();
  atStop.setHours(hours ?? 0, (minutes ?? 0) + boardingOffset, 0, 0);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.rowDisabled]}
    >
      <View style={styles.time}>
        <Text style={styles.timeValue}>
          {atStop.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </Text>
        <Text style={styles.timeNote}>at your stop</Text>
      </View>

      <View style={styles.flex}>
        <Text style={styles.rowTitle}>
          Departs {departure.departureTime.slice(0, 5)}
        </Text>
        <Text style={styles.rowNote}>{departure.seatCapacity} seats</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  spinner: { marginVertical: spacing.lg },
  label: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stops: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
