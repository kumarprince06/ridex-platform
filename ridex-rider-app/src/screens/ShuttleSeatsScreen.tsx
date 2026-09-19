import { Ionicons } from '@expo/vector-icons';
import { clockTime, money } from '../lib/format';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getPoints, spendableNow } from '../api/points';
import { ApiError } from '../api/problem';
import { payForSeat } from '../api/shuttleCheckout';
import { bookSeat, seatMap } from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { BrandLoader } from '../components/BrandLoader';
import { Screen, ScreenTitle } from '../components/Screen';
import { ShuttleSeatMap } from '../components/ShuttleSeatMap';
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
  const [usePoints, setUsePoints] = useState(false);
  const { data: points } = useQuery(getPoints, []);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [autoPicked, setAutoPicked] = useState(false);

  // A seat is picked up front so booking is one tap; the rider can still tap another.
  useEffect(() => {
    if (data && !chosen) {
      const free = data.seats.find((seat) => seat.available);
      if (free) {
        setChosen(free.label);
        setAutoPicked(true);
      }
    }
  }, [data, chosen]);

  // What the toggle takes off, the way the server will work it out: capped by the balance, by what
  // one journey may spend, and by the fare. Shown before the tap, not on the ticket afterwards.
  const discountMinor =
    usePoints && points && data?.fareMinor != null
      ? Math.min(spendableNow(points).valueMinor, data.fareMinor)
      : 0;
  const payableMinor = data?.fareMinor == null ? null : data.fareMinor - discountMinor;

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
        paymentMethod: 'UPI',
        // The whole balance is offered; the server takes only what this fare can absorb.
        redeemPoints: usePoints && points ? spendableNow(points).points : undefined,
      });

      // Checkout runs here rather than on the ticket: the seat is only held for ten minutes, and
      // a rider who lands on a ticket screen and wanders off loses it.
      const paid = result.checkout ? await payForSeat(result) : result;
      navigation.replace('ShuttleBooked', { booking: paid });
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
          <BrandLoader size={72} label="Checking free seats" style={styles.spinner} />
        ) : (
          <Text style={styles.empty}>{error ?? 'That departure is not available.'}</Text>
        )}
      </Screen>
    );
  }

  const departsAt = new Date(data.departsAt);


  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Pick a seat"
      footer={
        <>
          {bookError ? <Text style={styles.error}>{bookError}</Text> : null}
          {autoPicked && chosen && !bookError ? (
            <Text style={styles.autoPicked}>Seat {chosen} picked for you. Tap any free seat to change it.</Text>
          ) : null}
          {discountMinor > 0 && data?.fareMinor != null ? (
            <Text style={styles.discountNote}>
              {money(data.fareMinor, data.currency ?? 'INR')} fare ·{' '}
              {money(discountMinor, data.currency ?? 'INR')} off with points
            </Text>
          ) : null}
          <Button
            label={
              booking
                ? 'Booking…'
                : !chosen
                  ? 'Choose a seat'
                  : payableMinor == null
                    ? `Pay & book seat ${chosen}`
                    : `Pay ${money(payableMinor, data?.currency ?? 'INR')} · seat ${chosen}`
            }
            disabled={!chosen || booking}
            onPress={confirm}
          />
        </>
      }
    >
      <ScreenTitle
        title={data.routeName}
        subtitle={`${departsAt.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })} · departs ${clockTime(departsAt)}`}
      />

      <Text style={styles.available}>
        {data.seatsAvailable} of {data.seatCapacity} free on your leg
      </Text>

      <ShuttleSeatMap
        seats={data.seats}
        seatsPerRow={data.seatsPerRow}
        aisleAfter={data.aisleAfter}
        chosen={chosen}
        onChoose={(label) => {
          setChosen(label);
          setAutoPicked(false);
        }}
      />

      {/* Only when there is something to spend: a toggle that can take nothing off is worse
          than no toggle. A balance below one rupee's worth counts as nothing. */}
      {points && spendableNow(points).points > 0 ? (
        <Pressable
          onPress={() => setUsePoints((on) => !on)}
          accessibilityRole="switch"
          accessibilityState={{ checked: usePoints }}
          style={({ pressed }) => [
            styles.pointsRow,
            usePoints && styles.pointsRowOn,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={usePoints ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={usePoints ? colors.primary : colors.textMuted}
          />
          <View style={styles.flex}>
            <Text style={styles.pointsTitle}>
              Use {spendableNow(points).points} points
            </Text>
            {/* Capped per journey; the fare caps it again server-side. */}
            <Text style={styles.pointsNote}>
              Up to {money(spendableNow(points).valueMinor, points.currency)} off
              {points.balance > points.maxRedeemPerJourney
                ? ` · ${points.balance} in your balance`
                : ''}
            </Text>
          </View>
        </Pressable>
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  autoPicked: {
    ...type.caption,
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.amberSurface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  discountNote: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  flex: { flex: 1 },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pointsRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  pointsTitle: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  pointsNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  pressed: { opacity: 0.75 },
  spinner: {
    flexGrow: 1,
    justifyContent: 'center',
  },
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
});
