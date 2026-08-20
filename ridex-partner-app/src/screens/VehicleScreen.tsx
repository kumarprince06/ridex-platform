import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { VEHICLE } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Vehicle'>;

export function VehicleScreen({ navigation }: Props) {
  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Vehicle"
      footer={<Button label="Request a change" variant="secondary" />}
    >
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons name="car-sport" size={30} color={colors.primary} />
        </View>
        <Text style={styles.name}>
          {VEHICLE.make} {VEHICLE.model}
        </Text>
        <View style={styles.statusPill}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.statusLabel}>{VEHICLE.status}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Line label="Plate" value={VEHICLE.plate} />
        <Line label="Year" value={VEHICLE.year} />
        <Line label="Colour" value={VEHICLE.colour} />
        <Line label="Ride type" value={VEHICLE.type} />
        <Line label="Seats" value={VEHICLE.seats} last />
      </View>

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
