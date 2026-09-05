import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import {
  VEHICLE_LABELS,
  deactivateVehicle,
  listVehicles,
  type Vehicle,
  type VehicleStatus,
} from '../api/vehicles';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootScreenProps } from '../navigation/types';
import { colors, IconName, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Vehicle'>;

const STATUS: Record<VehicleStatus, { label: string; colour: string; icon: IconName }> = {
  ACTIVE: { label: 'Approved', colour: colors.success, icon: 'checkmark-circle' },
  PENDING_REVIEW: { label: 'Under review', colour: colors.warning, icon: 'hourglass' },
  REJECTED: { label: 'Rejected', colour: colors.danger, icon: 'close-circle' },
  INACTIVE: { label: 'Off the road', colour: colors.textMuted, icon: 'pause-circle' },
};

export function VehicleScreen({ navigation }: Props) {
  const { data, loading, error, refetch } = useQuery(listVehicles, []);
  const vehicles = data ?? [];

  async function takeOffRoad(vehicle: Vehicle) {
    try {
      await deactivateVehicle(vehicle.id);
      refetch();
    } catch (caught) {
      Alert.alert(
        'Could not update',
        caught instanceof ApiError ? caught.userMessage : 'Something went wrong.',
      );
    }
  }

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Vehicle"
      footer={
        <Button
          label="Add a vehicle"
          variant="secondary"
          onPress={() => navigation.navigate('VehicleDetails')}
        />
      }
    >
      {loading && data == null ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && vehicles.length === 0 ? (
        <Text style={styles.empty}>
          No vehicle yet. Add one and operations will review it before you can drive.
        </Text>
      ) : null}

      {vehicles.map((vehicle) => {
        const status = STATUS[vehicle.status];

        return (
          <View key={vehicle.id} style={styles.block}>
            <View style={styles.hero}>
              <View style={styles.icon}>
                <Ionicons name="car-sport" size={30} color={colors.primary} />
              </View>
              <Text style={styles.name}>
                {vehicle.make} {vehicle.model}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name={status.icon} size={14} color={status.colour} />
                <Text style={[styles.statusLabel, { color: status.colour }]}>{status.label}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Line label="Plate" value={vehicle.registrationNumber} />
              <Line label="Year" value={String(vehicle.manufactureYear)} />
              <Line label="Colour" value={vehicle.color ?? '—'} />
              <Line label="Type" value={VEHICLE_LABELS[vehicle.vehicleType]} />
              <Line label="Seats" value={String(vehicle.seatCapacity)} last />
            </View>

            {/* Only an on-road vehicle can be taken off it. Coming back needs another review. */}
            {vehicle.status === 'ACTIVE' || vehicle.status === 'PENDING_REVIEW' ? (
              <Button
                label="Take off the road"
                variant="secondary"
                onPress={() => takeOffRoad(vehicle)}
                style={styles.deactivate}
              />
            ) : null}
          </View>
        );
      })}

      <Text style={styles.note}>
        Changing your vehicle needs a fresh registration and insurance check, so it goes back through
        review before you can drive it.
      </Text>
    </Screen>
  );
}

function Line({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.line, !last && styles.lineBorder]}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: {
    marginTop: spacing.xl,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  block: {
    marginBottom: spacing.xl,
  },
  deactivate: {
    marginTop: spacing.md,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  icon: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...type.title,
    fontSize: 22,
    color: colors.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  statusLabel: {
    ...type.caption,
    color: colors.success,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  lineBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  lineValue: {
    ...type.body,
    color: colors.text,
  },
  note: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});
