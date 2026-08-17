import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { Sheet } from '../components/Sheet';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverArrived'>;

export function DriverArrivedScreen({ navigation, route }: Props) {
  const { destination } = route.params;

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

          <Button
            label="Start Trip"
            onPress={() => navigation.navigate('TripInProgress', { destination })}
            style={styles.start}
          />
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
  start: {
    flex: 1,
    borderRadius: radius.pill,
  },
});
