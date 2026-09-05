import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMoney, getReceipt } from '../api/rides';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { StatTiles } from '../components/StatTiles';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RideCompleted'>;

export function RideCompletedScreen({ navigation, route }: Props) {
  const { destination, rideId } = route.params;

  const { data: receipt } = useQuery(
    () => (rideId ? getReceipt(rideId) : Promise.resolve(null)),
    [rideId],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={styles.glow}>
          <View style={styles.mark}>
            <Ionicons name="home" size={34} color={colors.onPrimary} />
          </View>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>Ride Completed</Text>
        </View>

        <Text style={styles.title}>You have arrived!</Text>
        <Text style={styles.destination}>{destination}</Text>

        <View style={styles.fareRow}>
          <Text style={styles.fare}>
            {receipt ? formatMoney(receipt.chargedTotalMinor, receipt.currency) : '—'}
          </Text>
          <View>
            <Text style={styles.chargedTo}>paid by</Text>
            <Text style={styles.card}>Cash</Text>
          </View>
        </View>

        {/* Distance and the quote comparison, because those are what the receipt actually knows.
            Duration and a driver rating are not on this response. */}
        <StatTiles
          stats={[
            {
              value: receipt ? `${(receipt.actualDistanceMeters / 1000).toFixed(1)} km` : '—',
              label: 'Distance',
            },
            {
              value: receipt ? formatMoney(receipt.quotedTotalMinor, receipt.currency) : '—',
              label: 'Quoted',
            },
            {
              value:
                receipt && receipt.differenceMinor !== 0
                  ? formatMoney(receipt.differenceMinor, receipt.currency)
                  : 'As quoted',
              label: 'Difference',
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Button label="Rate Your Ride" onPress={() => navigation.navigate('RateDriver', { rideId })} />
        {/* Was navigating to a hardcoded fixture id, which opened somebody else's receipt. */}
        {rideId ? (
          <Button
            label="View Receipt"
            variant="secondary"
            onPress={() => navigation.navigate('TripReceipt', { rideId })}
            style={styles.secondary}
          />
        ) : null}
        <Pressable
          onPress={() => navigation.popToTop()}
          accessibilityRole="button"
          style={styles.homeLink}
        >
          <Text style={styles.homeLinkText}>Back to Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  glow: {
    alignSelf: 'center',
    width: 128,
    height: 128,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
    marginTop: spacing.xl,
  },
  statusText: {
    ...type.caption,
    fontSize: 11,
    color: colors.primary,
  },
  title: {
    ...type.hero,
    fontSize: 30,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  destination: {
    ...type.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  fare: {
    ...type.hero,
    fontSize: 34,
    color: colors.primary,
  },
  chargedTo: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  card: {
    ...type.button,
    fontSize: 13,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  secondary: {
    marginTop: 0,
  },
  homeLink: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  homeLinkText: {
    ...type.button,
    fontSize: 15,
    color: colors.textMuted,
  },
});
