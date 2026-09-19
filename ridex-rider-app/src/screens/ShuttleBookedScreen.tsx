import { Ionicons } from '@expo/vector-icons';
import { clockTime, money, shortDate } from '../lib/format';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { cancelBooking } from '../api/shuttle';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { payForSeat } from '../api/shuttleCheckout';
import { Button } from '../components/Button';
import { BoardingPassModal } from '../components/BoardingPassModal';
import { DriverCard } from '../components/DriverCard';
import { JourneyLine } from '../components/JourneyLine';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'ShuttleBooked'>;

// Drivers can start a run 30 min early, so tracking opens then.
const TRACKING_OPENS_MS = 30 * 60 * 1000;
const TRACKING_CLOSES_MS = 2 * 60 * 60 * 1000;

export function ShuttleBookedScreen({ navigation, route }: Props) {
  const [booking, setBooking] = useState(route.params.booking);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showingPass, setShowingPass] = useState(false);

  const pending = booking.paymentStatus === 'PENDING';
  const cancelled = booking.status === 'CANCELLED';
  const departs = new Date(booking.departsAt);
  // The server enforces this too; this just keeps the button honest.
  const cancellable = !cancelled && Date.now() < new Date(booking.cancellableUntil).getTime();

  // Tracking from 30 min before departure until two hours after.
  const tracking =
    !cancelled && Date.now() > departs.getTime() - TRACKING_OPENS_MS
    && Date.now() < departs.getTime() + TRACKING_CLOSES_MS;

  async function pay() {
    setBusy(true);
    setNotice(null);
    try {
      setBooking(await payForSeat(booking));
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.userMessage : 'Could not pay for that seat.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setNotice(null);
    try {
      await cancelBooking(booking.id);
      setBooking({ ...booking, status: 'CANCELLED', paymentStatus:
        booking.creditIfCancelledMinor > 0 ? 'POINTS_CREDITED' : booking.paymentStatus });
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.userMessage : 'Could not cancel that seat.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Screen
      title="Your ticket"
      onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.popToTop())}
      footer={
        tracking ? (
          <Button label="Track shuttle" onPress={() => navigation.navigate('ShuttleTracking', { booking })} />
        ) : undefined
      }
    >
      {cancelled ? (
        <View style={styles.pending}>
          <Ionicons name="close-circle-outline" size={16} color={colors.amber} />
          <Text style={styles.pendingText}>
            This seat is cancelled.
            {booking.paymentStatus === 'POINTS_CREDITED'
              ? ' The points are in your rewards balance.'
              : ''}
          </Text>
        </View>
      ) : null}


      {pending && !cancelled ? (
        <Pressable
          onPress={pay}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.pending, pressed && styles.pressed]}
        >
          <Ionicons name="time-outline" size={16} color={colors.amber} />
          <Text style={styles.pendingText}>
            Seat held. Pay {money(booking.fareMinor, booking.currency)} to confirm it.
          </Text>
          <Text style={styles.payNow}>{busy ? '…' : 'Pay'}</Text>
        </Pressable>
      ) : null}


      <View style={styles.pass}>
        {/* Stub: what the rider reads, and what a driver checks against. */}
        <View style={styles.stub}>
          <View style={styles.stubTop}>
            <View>
              <Text style={styles.eyebrow}>SEAT</Text>
              <Text style={styles.seat}>{booking.seatLabel}</Text>
            </View>
            <View style={styles.stubRight}>
              <Text style={styles.eyebrow}>DEPARTS</Text>
              <Text style={styles.departs}>
                {clockTime(departs)}
              </Text>
              <Text style={styles.date}>
                {shortDate(departs)}
              </Text>
            </View>
          </View>

          <Text style={styles.route}>{booking.routeName}</Text>

          <View style={styles.legs}>
            <Leg label="From" value={booking.boardingStopName} />
            <View style={styles.legLine}>
              <JourneyLine />
            </View>
            <Leg label="To" value={booking.alightingStopName} align="right" />
          </View>
        </View>

        {/* The tear line, and the two notches that make it read as one. */}
        <View style={styles.tear}>
          <View style={[styles.notch, styles.notchLeft]} />
          <View style={styles.dashes} />
          <View style={[styles.notch, styles.notchRight]} />
        </View>

        <View style={styles.codeZone}>
          {booking.boardingCode ? (
            <Button label="Show boarding pass" onPress={() => setShowingPass(true)} />
          ) : (
            // Only its hash is stored, so a ticket reopened later has no code to show.
            <Text style={styles.codeLabel}>
              Your boarding code was shown when you booked. Ask the driver to check you in by name.
            </Text>
          )}
        </View>
      </View>

      {booking.crew ? (
        <View style={styles.crew}>
          <DriverCard
            name={booking.crew.driverName}
            phone={booking.crew.driverPhone}
            rating={booking.crew.driverRating}
            vehicle={booking.crew.vehicle}
            plate={booking.crew.registrationNumber}
          />
        </View>
      ) : null}

      <View style={styles.fareCard}>
        {booking.discountMinor > 0 ? (
          <>
            <FareRow label="Fare" value={money(booking.fareMinor, booking.currency)} />
            <FareRow
              label={`Points (${booking.redeemedPoints})`}
              value={`-${money(booking.discountMinor, booking.currency)}`}
              credit
            />
          </>
        ) : null}
        <FareRow
          label={booking.discountMinor > 0 ? 'Total' : 'Fare'}
          value={booking.passId ? 'Covered by your pass' : money(booking.fareMinor - booking.discountMinor, booking.currency)}
          strong
        />
        <FareRow
          label="Payment"
          value={booking.passId ? 'Pass' : pending ? 'Not paid yet' : 'Paid online'}
          last
        />
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {cancellable ? (
        <Pressable
          onPress={() => setConfirming(true)}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>Cancel this seat</Text>
          <Text style={styles.cancelNote}>
            {booking.creditIfCancelledMinor > 0
              ? `${money(booking.creditIfCancelledMinor, booking.currency)} back as points · closes 30 min before departure`
              : 'Closes 30 minutes before departure'}
          </Text>
        </Pressable>
      ) : null}
      {booking.boardingCode ? (
        <BoardingPassModal
          visible={showingPass}
          onClose={() => setShowingPass(false)}
          code={booking.boardingCode}
          seat={booking.seatLabel}
          route={booking.routeName}
        />
      ) : null}
      <ConfirmSheet
        visible={confirming}
        title="Cancel this seat?"
        body={
          booking.creditIfCancelledMinor > 0
            ? `${money(booking.creditIfCancelledMinor, booking.currency)} of ${money(booking.fareMinor, booking.currency)} comes back as points you can spend on your next ride. Seats cannot be cancelled within 30 minutes of departure.`
            : 'Nothing has been charged for this seat yet.'
        }
        confirmLabel="Cancel seat"
        cancelLabel="Keep it"
        destructive
        busy={busy}
        onConfirm={cancel}
        onDismiss={() => setConfirming(false)}
      />
    </Screen>
  );
}

function FareRow({ label, value, strong, credit, last }: { label: string; value: string; strong?: boolean; credit?: boolean; last?: boolean }) {
  return (
    <View style={[styles.fareRow, !last && styles.fareDivider]}>
      <Text style={styles.fareLabel}>{label}</Text>
      <Text style={[styles.fareValue, strong && styles.fareStrong, credit && styles.credit]}>{value}</Text>
    </View>
  );
}

function Leg({ label, value, align }: { label: string; value: string; align?: 'right' }) {
  return (
    <View style={[styles.flex, align === 'right' && styles.right]}>
      <Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
      <Text style={[styles.legValue, align === 'right' && styles.rightText]}>{value}</Text>
    </View>
  );
}

const NOTCH = 22;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  rightText: { textAlign: 'right' },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.amberSurface,
    borderWidth: 1,
    borderColor: colors.amber,
    marginBottom: spacing.lg,
  },
  pendingText: {
    ...type.caption,
    flex: 1,
    color: colors.text,
  },
  pass: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stub: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  stubTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stubRight: { alignItems: 'flex-end' },
  eyebrow: {
    ...type.eyebrow,
    color: colors.textFaint,
  },
  seat: {
    ...type.title,
    fontSize: 34,
    color: colors.primary,
  },
  departs: {
    ...type.title,
    fontSize: 22,
    color: colors.text,
  },
  date: {
    ...type.caption,
    color: colors.textMuted,
  },
  route: {
    ...type.body,
    color: colors.textMuted,
  },
  legs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  // Level with the stop names, not the labels above them.
  legLine: {
    flex: 0.8,
    marginTop: 20,
  },
  legValue: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
    marginTop: 2,
  },
  tear: {
    height: NOTCH,
    justifyContent: 'center',
  },
  dashes: {
    marginHorizontal: NOTCH / 2 + spacing.sm,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: colors.bg,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  codeZone: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  codeLabel: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  crew: {
    marginTop: spacing.lg,
  },
  pressed: { opacity: 0.75 },
  fareCard: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  fareDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fareLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  credit: {
    ...type.button,
    fontSize: 16,
    color: colors.primary,
  },
  fareValue: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  fareStrong: {
    fontSize: 17,
  },
  payNow: {
    ...type.button,
    fontSize: 14,
    color: colors.amber,
  },
  cancel: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cancelText: {
    ...type.button,
    fontSize: 15,
    color: colors.danger,
  },
  notice: {
    ...type.caption,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  cancelNote: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
