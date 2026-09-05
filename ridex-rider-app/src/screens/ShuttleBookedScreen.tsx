import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ApiError } from '../api/problem';
import { formatMoney } from '../api/rides';
import { cancelBooking } from '../api/shuttle';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { payForSeat } from '../api/shuttleCheckout';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'ShuttleBooked'>;

/**
 * The ticket, shaped like one.
 *
 * <p>Three identical grey cards read as a settings screen. A ticket has one thing on it that
 * matters at the door - the seat and the code - and everything else is smaller and below it.
 */
export function ShuttleBookedScreen({ navigation, route }: Props) {
  const [booking, setBooking] = useState(route.params.booking);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const pending = booking.paymentStatus === 'PENDING';
  const cashDue = booking.paymentStatus === 'CASH_DUE';
  const cancelled = booking.status === 'CANCELLED';
  const departs = new Date(booking.departsAt);
  // Half an hour before departure the seat can no longer be sold to anybody else, so it stops
  // being cancellable. The server decides this too; this only keeps the button honest.
  const cancellable = !cancelled && Date.now() < new Date(booking.cancellableUntil).getTime();

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
        <Button
          label="Done"
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.popToTop())}
        />
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
            Seat held. Pay {formatMoney(booking.fareMinor, booking.currency)} to confirm it.
          </Text>
          <Text style={styles.payNow}>{busy ? '…' : 'Pay'}</Text>
        </Pressable>
      ) : null}

      {cashDue && !cancelled ? (
        <View style={styles.pending}>
          <Ionicons name="cash-outline" size={16} color={colors.amber} />
          <Text style={styles.pendingText}>
            Pay {formatMoney(booking.fareMinor, booking.currency)} to the driver when you get on.
          </Text>
        </View>
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
                {departs.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
              <Text style={styles.date}>
                {departs.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>

          <Text style={styles.route}>{booking.routeName}</Text>

          <View style={styles.legs}>
            <Leg label="From" value={booking.boardingStopName} />
            <Ionicons name="arrow-forward" size={14} color={colors.textFaint} />
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
            <>
              <View style={styles.qrFrame}>
                {/* Light quiet zone: a QR inverted onto the dark surface will not scan on many readers. */}
                <QRCode
                  value={booking.boardingCode}
                  size={124}
                  backgroundColor="#FFFFFF"
                  color="#0B0F1A"
                />
              </View>
              <Text style={styles.codeLabel}>or read out this code</Text>
              <Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit>
                {booking.boardingCode}
              </Text>
            </>
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
          <View style={styles.plate}>
            <Text style={styles.plateText}>{booking.crew.registrationNumber}</Text>
          </View>

          <View style={styles.flex}>
            <Text style={styles.crewName}>{booking.crew.driverName}</Text>
            <Text style={styles.crewNote}>
              {booking.crew.vehicle}
              {booking.crew.driverRating ? ` · ${booking.crew.driverRating}★` : ''}
            </Text>
          </View>

          {booking.crew.driverPhone ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Call ${booking.crew.driverName}`}
              onPress={() => Linking.openURL(`tel:${booking.crew?.driverPhone}`)}
              style={({ pressed }) => [styles.call, pressed && styles.pressed]}
            >
              <Ionicons name="call" size={18} color={colors.onPrimary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.fare}>
        <Text style={styles.fareLabel}>Fare</Text>
        <Text style={styles.fareValue}>
          {/* A pass covered it, so nothing was charged - "0.00" would read as an error. */}
          {booking.passId ? 'Covered by your pass' : formatMoney(booking.fareMinor, booking.currency)}
        </Text>
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
              ? `${formatMoney(booking.creditIfCancelledMinor, booking.currency)} back as points · closes 30 min before departure`
              : 'Closes 30 minutes before departure'}
          </Text>
        </Pressable>
      ) : null}
      <ConfirmSheet
        visible={confirming}
        title="Cancel this seat?"
        body={
          booking.creditIfCancelledMinor > 0
            ? `${formatMoney(booking.creditIfCancelledMinor, booking.currency)} of ${formatMoney(booking.fareMinor, booking.currency)} comes back as points you can spend on your next ride. Seats cannot be cancelled within 30 minutes of departure.`
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
    alignItems: 'center',
    gap: spacing.md,
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
  qrFrame: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
  codeLabel: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  code: {
    ...type.title,
    fontSize: 30,
    letterSpacing: 8,
    color: colors.primary,
  },
  crew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  plate: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  plateText: {
    ...type.button,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.text,
  },
  crewName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  crewNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  call: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
  fare: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  fareLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  fareValue: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
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
