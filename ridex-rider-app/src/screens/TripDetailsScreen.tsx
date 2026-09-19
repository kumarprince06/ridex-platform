import { Ionicons } from '@expo/vector-icons';
import { money, when } from '../lib/format';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  getReceipt,
  getRide,
  isCancelled,
  isLive,
  rideRoute,
  rideStatusLabel,
  ridePayment,
} from '../api/rides';
import { payForRide } from '../api/rideCheckout';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { DriverCard } from '../components/DriverCard';
import { MapCanvas } from '../components/MapCanvas';
import { PickupPass } from '../components/PickupPass';
import { RouteStops } from '../components/RouteStops';
import { BrandLoader } from '../components/BrandLoader';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetails'>;

export function TripDetailsScreen({ navigation, route }: Props) {
  const { rideId } = route.params;
  const { data: ride, loading, error } = useQuery(() => getRide(rideId), [rideId]);

  // A rider who closed checkout still owes the fare, and this is where they come back to pay it.
  const { data: payment, refetch: refetchPayment } = useQuery(
    () => ridePayment(rideId).catch(() => null),
    [rideId],
  );
  const { data: receipt } = useQuery(() => getReceipt(rideId).catch(() => null), [rideId]);
  const [paying, setPaying] = useState(false);
  const outstanding = payment != null && !payment.settled;

  async function pay() {
    if (!payment) {
      return;
    }
    setPaying(true);
    try {
      await payForRide(rideId, payment);
      refetchPayment();
    } finally {
      setPaying(false);
    }
  }

  if (!ride) {
    return (
      <Screen onBack={() => navigation.goBack()} title="Trip Details">
        {loading ? (
          <BrandLoader size={72} label="Loading the trip" style={styles.spinner} />
        ) : (
          <Text style={styles.error}>{error ?? 'That trip could not be found.'}</Text>
        )}
      </Screen>
    );
  }

  const cancelled = isCancelled(ride.status);
  const completed = ride.status === 'COMPLETED';
  // What was actually charged, once the trip priced itself from the real distance and time.
  const charged = receipt?.chargedTotalMinor ?? ride.quotedFareMinor;
  const lines = receipt?.chargedLines ?? ride.fareLines;
  const live = isLive(ride.status);

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Trip Details"
      headerRight={
        <View style={styles.chip}>
          <Ionicons name="share-outline" size={18} color={colors.text} />
        </View>
      }
    >
      {/* MapCanvas fills its parent absolutely, so it needs a sized box to live in. */}
      <View style={styles.mapBox}>
        <MapCanvas
          showRoute
          pickupCoord={rideRoute(ride).pickup}
          destinationCoord={rideRoute(ride).destination}
        />
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.status, cancelled && styles.statusCancelled]}>
          <Ionicons
            name={cancelled ? 'close' : live ? 'ellipse' : 'checkmark'}
            size={11}
            color={cancelled ? colors.danger : colors.primary}
          />
          <Text style={[styles.statusText, cancelled && styles.statusTextCancelled]}>
            {rideStatusLabel(ride.status)}
          </Text>
        </View>
        <Text style={styles.when}>{when(ride.requestedAt)}</Text>
      </View>

      {/* The boarding pass, while it is still worth something. A code on a finished trip is not
          a pass, so the server stops sending one and this disappears with it. */}
      {live && ride.pickupCode ? (
        <PickupPass payload={ride.pickupCode} code={ride.pickupCode} />
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <RouteStops
            style={styles.flex}
            pickup={{ name: ride.pickupAddress ?? 'Pickup', detail: 'Pickup' }}
            dropoff={{ name: ride.destinationAddress ?? 'Destination', detail: 'Drop-off' }}
          />
          <Text style={styles.fare}>{money(charged, ride.currency)}</Text>
        </View>
      </View>

      {ride.driver ? (
        <View style={styles.driver}>
          <DriverCard
            name={ride.driver.name}
            phone={live ? ride.driver.phone : null}
            rating={ride.driver.rating}
            vehicle={ride.driver.vehicle}
            plate={ride.driver.registrationNumber}
          />
        </View>
      ) : null}

      {lines.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{completed ? 'Fare' : 'Quoted fare'}</Text>
          {lines.map((line) => (
            <View key={line.type + line.label} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{line.label}</Text>
              <Text style={styles.lineAmount}>{money(line.amountMinor, ride.currency)}</Text>
            </View>
          ))}
          {ride.redeemedPoints > 0 ? (
            <View style={styles.lineRow}>
              <Text style={styles.lineLabel}>Points redeemed</Text>
              <Text style={styles.lineAmount}>{ride.redeemedPoints}</Text>
            </View>
          ) : null}
          <View style={[styles.lineRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{money(charged, ride.currency)}</Text>
          </View>
          {receipt && receipt.differenceMinor !== 0 ? (
            <Text style={styles.reason}>
              Quoted {money(receipt.quotedTotalMinor, ride.currency)} · priced from the actual trip
            </Text>
          ) : null}
          {payment ? (
            <View style={styles.lineRow}>
              <Text style={styles.lineLabel}>Payment</Text>
              <Text style={[styles.lineAmount, !payment.settled && styles.due]}>
                {payment.method === 'CASH' ? 'Cash' : 'Online'} · {payment.settled ? 'Paid' : 'Due'}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {cancelled && ride.cancellationFeeMinor ? (
        <View style={styles.card}>
          <View style={styles.lineRow}>
            <Text style={styles.lineLabel}>Cancellation fee</Text>
            <Text style={styles.lineAmount}>
              {money(ride.cancellationFeeMinor, ride.currency)}
            </Text>
          </View>
          {ride.cancellationReason ? (
            <Text style={styles.reason}>{ride.cancellationReason}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Report Issue"
          variant="secondary"
          onPress={() => navigation.navigate('ReportIssue', { rideId })}
          style={styles.flex}
        />
        {outstanding ? (
          <Button
            label={paying ? 'Opening...' : `Pay ${money(payment.amountMinor, payment.currency)}`}
            onPress={() => void pay()}
            style={styles.flex}
          />
        ) : completed ? (
          <Button
            label="View Receipt"
            onPress={() => navigation.navigate('TripReceipt', { rideId: ride.id })}
            style={styles.flex}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBox: {
    height: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.lg,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
  },
  statusText: {
    ...type.caption,
    fontSize: 11,
    color: colors.primary,
  },
  when: {
    ...type.caption,
    color: colors.textMuted,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  fare: {
    ...type.hero,
    fontSize: 21,
    color: colors.primary,
  },
  statusCancelled: {
    backgroundColor: 'rgba(255, 92, 122, 0.14)',
  },
  statusTextCancelled: {
    color: colors.danger,
  },
  spinner: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  error: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  lineLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  lineAmount: {
    ...type.body,
    color: colors.text,
  },
  reason: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  driver: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  totalLabel: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  totalAmount: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  due: {
    color: colors.amber,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
