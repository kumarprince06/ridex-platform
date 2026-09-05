import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { RouteStops } from '../components/RouteStops';
import { Screen } from '../components/Screen';
import { formatMoney, formatWhen, getReceipt, getRide } from '../api/rides';
import { useQuery } from '../api/useQuery';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TripReceipt'>;

export function TripReceiptScreen({ navigation, route }: Props) {
  const { rideId } = route.params;

  // Two calls because the split is real: the receipt is what was charged, the ride is where it
  // went and when. Neither response carries the other's half.
  const { data, loading, error } = useQuery(
    () => Promise.all([getReceipt(rideId), getRide(rideId)]),
    [rideId],
  );
  const [receipt, ride] = data ?? [null, null];

  if (!receipt || !ride) {
    return (
      <Screen onBack={() => navigation.goBack()} title="Trip Receipt">
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : (
          <Text style={styles.empty}>{error ?? 'No receipt for this trip yet.'}</Text>
        )}
      </Screen>
    );
  }

  const lines = receipt.chargedLines;
  const overrun = receipt.differenceMinor;

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Trip Receipt"
      headerRight={
        <View style={styles.chip}>
          <Ionicons name="share-outline" size={18} color={colors.text} />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Ionicons name="navigate" size={22} color={colors.onPrimary} />
        </View>

        <Text style={styles.total}>
          {formatMoney(receipt.chargedTotalMinor, receipt.currency)}
        </Text>
        <Text style={styles.date}>{formatWhen(ride.requestedAt)}</Text>

        {/* Cash is the only method the platform settles today, so naming a card here would be
            inventing a payment that never happened. */}
        <View style={styles.paidPill}>
          <Text style={styles.paidText}>Paid</Text>
        </View>
      </View>

      <View style={styles.card}>
        <RouteStops
          pickup={{ name: ride.pickupAddress ?? 'Pickup' }}
          dropoff={{
            name: ride.destinationAddress ?? 'Destination',
            detail: `${(receipt.actualDistanceMeters / 1000).toFixed(1)} km driven`,
          }}
        />
      </View>

      <View style={styles.card}>
        {lines.map((line, index) => (
          <View key={`${line.type}-${index}`} style={styles.row}>
            <Text style={styles.label}>{line.label}</Text>
            <Text style={[styles.amount, line.amountMinor < 0 && styles.credit]}>
              {formatMoney(line.amountMinor, receipt.currency)}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>
            {formatMoney(receipt.chargedTotalMinor, receipt.currency)}
          </Text>
        </View>

        {overrun !== 0 ? (
          <View style={styles.compare}>
            {/* The thing no competitor shows: what was quoted, against what was charged. */}
            <View style={styles.row}>
              <Text style={styles.label}>You were quoted</Text>
              <Text style={styles.amount}>
                {formatMoney(receipt.quotedTotalMinor, receipt.currency)}
              </Text>
            </View>
            <Text style={styles.compareNote}>
              {overrun > 0 ? 'Charged ' : 'Reduced by '}
              {formatMoney(Math.abs(overrun), receipt.currency)}
              {overrun > 0 ? ' more · ' : ' · '}
              {(receipt.actualDistanceMeters / 1000).toFixed(1)} km driven against{' '}
              {(receipt.quotedDistanceMeters / 1000).toFixed(1)} km quoted
            </Text>
          </View>
        ) : null}
      </View>

      {/* No driver card: the receipt endpoint carries no driver, and a name copied from a fixture
          on a document about money is the worst place to guess. */}
      <View style={[styles.card, styles.driverCard]}>
        <View style={styles.flex}>
          <Text style={styles.driverName}>{ride.rideTypeCode}</Text>
          <Text style={styles.driverMeta}>{formatWhen(ride.requestedAt)}</Text>
        </View>
        <View style={styles.tripPill}>
          <Text style={styles.tripPillText}>Trip #{ride.id.slice(-8)}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: {
    marginTop: spacing.xl,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  compare: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  compareNote: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
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
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '10deg' }],
  },
  total: {
    ...type.hero,
    fontSize: 34,
    color: colors.primary,
    marginTop: spacing.lg,
  },
  date: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  paidPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
    marginTop: spacing.md,
  },
  paidText: {
    ...type.caption,
    fontSize: 11,
    color: colors.primary,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: {
    ...type.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  amount: {
    ...type.body,
    fontSize: 14,
    color: colors.text,
  },
  credit: {
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
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
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  driverMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  tripPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  tripPillText: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
