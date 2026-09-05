import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import {
  formatMoney,
  formatWhen,
  getRide,
  isCancelled,
  isLive,
  rideStatusLabel,
} from '../api/rides';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { RouteStops } from '../components/RouteStops';
import { BrandLoader } from '../components/BrandLoader';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetails'>;

export function TripDetailsScreen({ navigation, route }: Props) {
  const { rideId } = route.params;
  const { data: ride, loading, error } = useQuery(() => getRide(rideId), [rideId]);

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
        <MapCanvas showRoute />
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
        <Text style={styles.when}>{formatWhen(ride.requestedAt)}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <RouteStops
            style={styles.flex}
            pickup={{ name: ride.pickupAddress ?? 'Pickup', detail: 'Pickup' }}
            dropoff={{ name: ride.destinationAddress ?? 'Destination', detail: 'Drop-off' }}
          />
          <Text style={styles.fare}>{formatMoney(ride.quotedFareMinor, ride.currency)}</Text>
        </View>
      </View>

      {/* The fare breakdown, not a driver card: the endpoint carries no driver, and "why am I
          paying this" is the question this screen is actually opened to answer. */}
      {ride.fareLines.length > 0 ? (
        <View style={styles.card}>
          {ride.fareLines.map((line) => (
            <View key={line.type + line.label} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{line.label}</Text>
              <Text style={styles.lineAmount}>{formatMoney(line.amountMinor, ride.currency)}</Text>
            </View>
          ))}
          {ride.redeemedPoints > 0 ? (
            <View style={styles.lineRow}>
              <Text style={styles.lineLabel}>Points redeemed</Text>
              <Text style={styles.lineAmount}>{ride.redeemedPoints}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {cancelled && ride.cancellationFeeMinor ? (
        <View style={styles.card}>
          <View style={styles.lineRow}>
            <Text style={styles.lineLabel}>Cancellation fee</Text>
            <Text style={styles.lineAmount}>
              {formatMoney(ride.cancellationFeeMinor, ride.currency)}
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
          onPress={() => navigation.navigate('ReportIssue')}
          style={styles.flex}
        />
        {/* A receipt exists only once the trip was actually charged. */}
        {ride.status === 'COMPLETED' ? (
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
    marginTop: spacing.xl,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
