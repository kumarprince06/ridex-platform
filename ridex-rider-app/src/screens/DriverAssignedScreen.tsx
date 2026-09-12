import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { MapCanvas } from '../components/MapCanvas';
import { Sheet } from '../components/Sheet';
import { driverCoordOf, useJourney } from '../lib/journey';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverAssigned'>;

export function DriverAssignedScreen({ navigation, route }: Props) {
  const { destination, rideId } = route.params;
  const { ride } = useJourney(rideId, 'DriverAssigned', navigation, destination);
  const driver = ride?.driver;
  const driverAt = driverCoordOf(ride);

  return (
    <View style={styles.root}>
      <MapCanvas showRoute driverCoord={driverAt} driverLabel={driver?.name ?? 'Driver'} />

      <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.chip}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Driver Assigned</Text>
          </View>

          <View style={styles.chip}>
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.text} />
          </View>
        </View>
      </SafeAreaView>

      <Sheet>
        <View style={styles.eta}>
          <View>
            <Text style={styles.etaLabel}>Arriving in</Text>
            <Text style={styles.etaValue}>3 min</Text>
          </View>
          <View style={styles.etaRight}>
            <Text style={styles.etaLabel}>Distance</Text>
            <Text style={styles.etaDistance}>0.8 km</Text>
          </View>
        </View>

        <View style={styles.driverRow}>
          <View>
            <Avatar name={driver?.name ?? 'Your driver'} size={50} />
            <View style={styles.verified}>
              <Ionicons name="checkmark" size={9} color={colors.onPrimary} />
            </View>
          </View>

          <View style={styles.flex}>
            <Text style={styles.driverName}>{driver?.name ?? 'Assigning your driver'}</Text>
            {driver?.rating ? <Text style={styles.driverMeta}>★ {driver.rating}</Text> : null}
          </View>

          <View style={styles.actionChip}>
            <Ionicons name="call" size={17} color={colors.primary} />
          </View>
          <View style={styles.actionChip}>
            <Ionicons name="alert-circle-outline" size={17} color={colors.text} />
          </View>
        </View>

        <View style={styles.vehicle}>
          <Ionicons name="car" size={20} color="#E0785A" />
          <View style={styles.flex}>
            <Text style={styles.vehicleName}>{driver?.vehicle ?? 'Vehicle on its way'}</Text>
          </View>
          {driver ? (
            <View style={styles.plate}>
              <Text style={styles.plateText}>{driver.registrationNumber}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.navigate('CancelRide', { rideId })}
            accessibilityRole="button"
            style={styles.cancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          {/* The screen moves when the driver does, so there is nothing to press: a "track"
              button would only jump ahead of the server and bounce the rider back. */}
          <Text style={styles.tracking}>Tracking your driver</Text>
        </View>
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
  header: {
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  statusText: {
    ...type.button,
    fontSize: 14,
    color: colors.text,
  },
  eta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(46, 231, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46, 231, 199, 0.3)',
  },
  etaLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  etaValue: {
    ...type.hero,
    fontSize: 26,
    color: colors.primary,
  },
  etaRight: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  etaDistance: {
    ...type.button,
    fontSize: 17,
    color: colors.text,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  verified: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 17,
    height: 17,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
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
  },
  actionChip: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleName: {
    ...type.button,
    fontSize: 14,
    color: colors.text,
  },
  vehicleColor: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  cancel: {
    flex: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  tracking: {
    ...type.body,
    color: colors.textMuted,
    flex: 1,
    textAlign: 'center',
  },
});
