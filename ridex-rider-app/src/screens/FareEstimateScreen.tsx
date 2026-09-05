import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  bookRide,
  estimate,
  formatMoney,
  outstandingDues,
  type EstimateOption,
  type PaymentMethod,
} from '../api/rides';
import { getPoints } from '../api/points';
import { useQuery } from '../api/useQuery';
import { ApiError } from '../api/problem';
import { Button } from '../components/Button';
import { RouteStops } from '../components/RouteStops';
import { Screen } from '../components/Screen';
import { RIDE_TIERS } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FareEstimate'>;

const METHODS: { id: PaymentMethod; icon: 'cash' | 'phone-portrait'; tone: string; label: string }[] = [
  { id: 'CASH', icon: 'cash', tone: '#5FD68A', label: 'Cash' },
  { id: 'UPI', icon: 'phone-portrait', tone: '#E0B252', label: 'UPI' },
];

export function FareEstimateScreen({ navigation, route }: Props) {
  const { destination, tierId, estimateId, pickupCoord, pickupName, destinationCoord } =
    route.params;
  const [methodId, setMethodId] = useState<PaymentMethod>('CASH');
  const [usePoints, setUsePoints] = useState(false);
  const { data: points } = useQuery(getPoints, []);
  // An earlier cancellation is collected with this fare, so it is shown here rather than turning
  // up as a bigger charge than the quote the rider agreed to.
  const { data: dues } = useQuery(outstandingDues, []);
  const [quote, setQuote] = useState<EstimateOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tier = RIDE_TIERS.find((item) => item.id === tierId) ?? RIDE_TIERS[0]!;

  useEffect(() => {
    if (!estimateId || !pickupCoord || !destinationCoord) {
      return;
    }
    // Re-priced rather than passed through navigation params: a quote is short-lived, and a stale
    // one in a route param is exactly the number a rider would be shown and then not charged.
    void (async () => {
      try {
        const priced = await estimate(pickupCoord, destinationCoord);
        setQuote(priced.find((option) => option.rideTypeCode === tierId) ?? priced[0] ?? null);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.userMessage : 'Could not price this trip.');
      }
    })();
  }, [estimateId, tierId, pickupCoord, destinationCoord]);

  async function onRequestRide() {
    if (!quote) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const ride = await bookRide({
        estimateId: quote.estimateId,
        pickupAddress: pickupName ?? 'Current location',
        destinationAddress: destination,
        redeemPoints: usePoints ? points?.balance : undefined,
        paymentMethod: methodId,
      });
      navigation.replace('FindingDriver', { destination, rideId: ride.id });
    } catch (caught) {
      // An expired quote lands here: re-quoting is the rider's choice, not something to do
      // silently at a price they never saw.
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not request the ride.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Fare Estimate"
      footer={
        <Button
          label={
            busy
              ? 'Requesting...'
              : quote
                ? `Request Ride · ${formatMoney(quote.totalMinor, quote.currency)}`
                : 'Pricing...'
          }
          disabled={busy || !quote}
          onPress={onRequestRide}
        />
      }
    >
      <View style={styles.card}>
        <RouteStops
          pickup={{ name: pickupName ?? 'Current location', detail: 'Pickup' }}
          dropoff={{ name: destination, detail: 'Drop-off' }}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.tierRow}>
          <View style={[styles.tierIcon, { backgroundColor: `${tier.tone}2E` }]}>
            <Ionicons name={tier.icon} size={20} color={tier.tone} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierMeta}>
              {quote
                ? `${Math.max(1, Math.round(quote.durationSeconds / 60))} min · ${quote.seatCapacity} seats`
                : tier.blurb}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {(quote?.lines ?? []).map((line, index) => (
          <View key={`${line.type}-${index}`} style={styles.fareRow}>
            <Text style={styles.fareLabel}>{line.label}</Text>
            {/* Negative lines are discounts, and are shown as credits rather than as a figure
                the reader has to know to subtract. */}
            <Text style={[styles.fareAmount, line.amountMinor < 0 && styles.credit]}>
              {formatMoney(line.amountMinor, quote!.currency)}
            </Text>
          </View>
        ))}

        {dues && !dues.free ? (
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Cancellation fee from an earlier ride</Text>
            <Text style={styles.fareAmount}>{formatMoney(dues.feeMinor, dues.currency)}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.divider} />

        <View style={styles.fareRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>
            {quote ? formatMoney(quote.totalMinor, quote.currency) : '—'}
          </Text>
        </View>
      </View>

      {points && points.balance > 0 ? (
        <Pressable
          onPress={() => setUsePoints((on) => !on)}
          accessibilityRole="switch"
          accessibilityState={{ checked: usePoints }}
          style={styles.card}
        >
          <View style={styles.tierRow}>
            <View style={styles.flex}>
              <Text style={styles.tierName}>Use {points.balance} points</Text>
              {/* The server decides how many are actually spendable on this fare, so this is
                  what they are worth at most, not a promise. */}
              <Text style={styles.tierMeta}>
                Up to {formatMoney(points.redeemableValueMinor, points.currency)} off
              </Text>
            </View>
            <Ionicons
              name={usePoints ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={usePoints ? colors.primary : colors.textMuted}
            />
          </View>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.methodsLabel}>PAYMENT METHOD</Text>
        <View style={styles.methods}>
          {METHODS.map((method) => {
            const selected = method.id === methodId;
            return (
              <Pressable
                key={method.id}
                onPress={() => setMethodId(method.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.method, selected && styles.methodSelected]}
              >
                <Ionicons name={method.icon} size={18} color={method.tone} />
                <Text style={styles.methodLabel}>{method.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  flex: {
    flex: 1,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tierIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierName: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  tierMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  fareLabel: {
    ...type.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  fareAmount: {
    ...type.body,
    fontSize: 14,
    color: colors.text,
  },
  credit: {
    color: colors.primary,
  },
  totalLabel: {
    ...type.button,
    color: colors.text,
  },
  totalAmount: {
    ...type.button,
    fontSize: 17,
    color: colors.primary,
  },
  methodsLabel: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  methods: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  method: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  methodSelected: {
    borderColor: colors.primary,
  },
  methodLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.text,
  },
});
