import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MapCanvas } from '../components/MapCanvas';
import { PickupPass } from '../components/PickupPass';
import { Sheet } from '../components/Sheet';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverArrived'>;

/**
 * Stand-ins for the pickup pass. Both come from the server with the trip (T11): the QR payload is
 * a signed, single-use token, and the code is issued alongside it. Nothing about either is
 * derived on the device.
 */
const PICKUP_CODE = '4821';
const PICKUP_PAYLOAD = 'ridex://pickup/RX-9241?code=4821';

/** Stands in for the driver scanning the pass and the server starting the trip (T11). */
const START_MS = 9000;

export function DriverArrivedScreen({ navigation, route }: Props) {
  const { destination } = route.params;

  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('TripInProgress', { destination }), START_MS);
    return () => clearTimeout(timer);
  }, [navigation, destination]);

  return (
    <View style={styles.root}>
      {/* Driver puck sits on the pickup pin: driverAt 0 is the pickup end of the route. */}
      <MapCanvas showRoute driverAt={0} driverLabel="Arrived!" />

      <Sheet>
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="checkmark" size={19} color={colors.onPrimary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.bannerTitle}>Your driver has arrived!</Text>
            <Text style={styles.bannerBody}>Please head to the pickup point</Text>
          </View>
        </View>

        <PickupPass payload={PICKUP_PAYLOAD} code={PICKUP_CODE} />

        <View style={styles.vehicle}>
          <Ionicons name="car" size={22} color="#E0785A" />
          <View style={styles.flex}>
            <Text style={styles.vehicleName}>Toyota Camry 2022</Text>
            <Text style={styles.vehicleMeta}>Pearl White · Marcus Rivera</Text>
          </View>
          <View style={styles.right}>
            <View style={styles.plate}>
              <Text style={styles.plateText}>RX · 4821</Text>
            </View>
            <Text style={styles.rating}>★ 4.92</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={styles.call}>
            <Ionicons name="call" size={15} color={colors.primary} />
            <Text style={styles.callText}>Call Driver</Text>
          </Pressable>

          <Pressable accessibilityRole="button" style={styles.call}>
            <Ionicons name="chatbubble-ellipses" size={15} color={colors.primary} />
            <Text style={styles.callText}>Message</Text>
          </Pressable>
        </View>

        <Text style={styles.waiting}>
          The trip starts once your driver scans the code above.
        </Text>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(46, 231, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46, 231, 199, 0.3)',
  },
  bannerIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    ...type.button,
    fontSize: 15,
    color: colors.primary,
  },
  bannerBody: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  vehicleName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  vehicleMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  plate: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
  },
  plateText: {
    ...type.button,
    fontSize: 13,
    color: colors.primary,
  },
  rating: {
    ...type.caption,
    fontSize: 11,
    color: colors.amber,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  call: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  callText: {
    ...type.button,
    fontSize: 15,
    color: colors.primary,
  },
  waiting: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
