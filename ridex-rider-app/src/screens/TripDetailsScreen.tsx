import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { RouteStops } from '../components/RouteStops';
import { Screen } from '../components/Screen';
import { Stars } from '../components/Stars';
import { DRIVER, RIDES } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetails'>;

export function TripDetailsScreen({ navigation, route }: Props) {
  const ride = RIDES.find((item) => item.id === route.params.rideId) ?? RIDES[0]!;

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
        <View style={styles.status}>
          <Ionicons name="checkmark" size={11} color={colors.primary} />
          <Text style={styles.statusText}>{ride.status}</Text>
        </View>
        <Text style={styles.when}>{ride.when}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <RouteStops
            style={styles.flex}
            pickup={{ name: ride.pickup, detail: 'Pickup' }}
            dropoff={{ name: ride.dropoff, detail: `Drop-off · ${ride.duration}` }}
          />
          <Text style={styles.fare}>{ride.fare}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.driverRow}>
          <Avatar name={DRIVER.name} size={50} />
          <View style={styles.flex}>
            <Text style={styles.driverName}>{DRIVER.name}</Text>
            <Text style={styles.driverMeta}>{DRIVER.vehicle}</Text>
            <Stars value={ride.rating} size={13} />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label="Report Issue"
          variant="secondary"
          onPress={() => navigation.navigate('ReportIssue')}
          style={styles.flex}
        />
        <Button
          label="View Receipt"
          onPress={() => navigation.navigate('TripReceipt', { rideId: ride.id })}
          style={styles.flex}
        />
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
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverName: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  driverMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
