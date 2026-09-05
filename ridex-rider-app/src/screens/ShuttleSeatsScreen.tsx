import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { bookSeat, seatMap, type Seat } from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'ShuttleSeats'>;

export function ShuttleSeatsScreen({ navigation, route }: Props) {
  const { scheduleId, serviceDate, boardingStopId, alightingStopId } = route.params;

  const { data, loading, error, refetch } = useQuery(
    () => seatMap(scheduleId, serviceDate, boardingStopId, alightingStopId),
    [scheduleId, serviceDate, boardingStopId, alightingStopId],
  );

  const [chosen, setChosen] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  async function confirm() {
    if (!chosen) {
      return;
    }
    setBooking(true);
    setBookError(null);
    try {
      const result = await bookSeat({
        scheduleId,
        serviceDate,
        boardingStopId,
        alightingStopId,
        seatLabel: chosen,
      });
      navigation.replace('ShuttleBooked', { booking: result });
    } catch (caught) {
      setBookError(caught instanceof ApiError ? caught.userMessage : 'Could not book that seat.');
      // Somebody else may have taken it in the meantime, so the map is refetched rather than left
      // showing a seat the server has just refused.
      setChosen(null);
      refetch();
      setBooking(false);
    }
  }

  if (!data) {
    return (
      <Screen onBack={() => navigation.goBack()} title="Pick a seat">
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : (
          <Text style={styles.empty}>{error ?? 'That departure is not available.'}</Text>
        )}
      </Screen>
    );
  }

  const departsAt = new Date(data.departsAt);

  // Chunked into rows exactly as the labels were generated, so what is drawn matches what the
  // server will accept.
  const rows: Seat[][] = [];
  for (let index = 0; index < data.seats.length; index += data.seatsPerRow) {
    rows.push(data.seats.slice(index, index + data.seatsPerRow));
  }

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Pick a seat"
      footer={
        <>
          {bookError ? <Text style={styles.error}>{bookError}</Text> : null}
          <Button
            label={
              booking ? 'Booking…' : chosen ? `Book seat ${chosen}` : 'Choose a seat'
            }
            disabled={!chosen || booking}
            onPress={confirm}
          />
        </>
      }
    >
      <ScreenTitle
        title={data.routeName}
        subtitle={`${departsAt.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })} · departs ${departsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
      />

      <Text style={styles.available}>
        {data.seatsAvailable} of {data.seatCapacity} free on your leg
      </Text>

      <View style={styles.bus}>
        {/* The front, so the rider can tell which end is which. A grid with no orientation is a
            spreadsheet, and "4A" means nothing without knowing where row 1 is. */}
        <View style={styles.front}>
          <Ionicons name="car-sport-outline" size={18} color={colors.textMuted} />
          <Text style={styles.frontLabel}>Front</Text>
        </View>

        {rows.map((seats, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {seats.map((seat, seatIndex) => (
              <View key={seat.label} style={styles.seatSlot}>
                <SeatButton
                  seat={seat}
                  chosen={chosen === seat.label}
                  onPress={() => setChosen(seat.label)}
                />
                {/* The gangway. Drawn between the seats it separates, not as a column of its own,
                    so a part-filled last row still lines up with the ones above it. */}
                {data.aisleAfter > 0 && seatIndex === data.aisleAfter - 1 ? (
                  <View style={styles.aisle} />
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <Legend style={styles.seatFree} label="Free" />
        <Legend style={styles.seatChosen} label="Yours" />
        <Legend style={styles.seatTaken} label="Taken" />
      </View>
    </Screen>
  );
}

function SeatButton({
  seat,
  chosen,
  onPress,
}: {
  seat: Seat;
  chosen: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!seat.available}
      accessibilityRole="button"
      accessibilityLabel={`Seat ${seat.label}, ${seat.available ? 'free' : 'taken'}`}
      accessibilityState={{ selected: chosen, disabled: !seat.available }}
      style={[
        styles.seat,
        seat.available ? styles.seatFree : styles.seatTaken,
        chosen && styles.seatChosen,
      ]}
    >
      <Text
        style={[
          styles.seatLabel,
          !seat.available && styles.seatLabelTaken,
          chosen && styles.seatLabelChosen,
        ]}
      >
        {seat.label}
      </Text>
    </Pressable>
  );
}

function Legend({ style, label }: { style: object; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, style]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: spacing.xl },
  empty: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  error: {
    ...type.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  available: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  /* Rounded at the top like a cabin, so the grid reads as a vehicle rather than a table. */
  bus: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radius.lg * 2,
    borderTopRightRadius: radius.lg * 2,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    backgroundColor: colors.surface,
  },
  front: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  frontLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  seatSlot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aisle: {
    width: spacing.xl,
  },
  seat: {
    width: 42,
    height: 42,
    marginHorizontal: 3,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  seatFree: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  seatTaken: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  seatChosen: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  seatLabel: {
    ...type.caption,
    fontSize: 12,
    color: colors.text,
  },
  seatLabelTaken: {
    color: colors.textFaint,
  },
  seatLabelChosen: {
    color: colors.onPrimary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
});
