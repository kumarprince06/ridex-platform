import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { MAX_SEATS, VEHICLE_ICONS, VEHICLE_LABELS, addVehicle, type VehicleType } from '../api/vehicles';
import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { TextField } from '../components/TextField';
import { RootScreenProps } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = RootScreenProps<'VehicleDetails'>;

/**
 * The passenger classes worth offering here, not all thirteen VehicleType values - nobody signs up
 * to drive a bus through this form. The physical class, not a ride tier: which tiers a vehicle can
 * serve is a pricing decision the platform makes from it.
 */
const TYPES = ['AUTO_RICKSHAW', 'HATCHBACK', 'SEDAN', 'SUV', 'MPV', 'VAN'] as const;


export function VehicleDetailsScreen({ navigation }: Props) {
  const [vehicleType, setVehicleType] = useState<(typeof TYPES)[number]>('SEDAN');
  const [picking, setPicking] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [colour, setColour] = useState('');
  const [seats, setSeats] = useState('4');
  const [saving, setSaving] = useState(false);

  const limit = MAX_SEATS[vehicleType];
  const seatsError =
    seats && Number(seats) > limit
      ? `A ${VEHICLE_LABELS[vehicleType].toLowerCase()} seats at most ${limit}.`
      : undefined;

  const incomplete = !make.trim() || !model.trim() || !year.trim() || !plate.trim() || !seats;

  async function save() {
    setSaving(true);
    try {
      await addVehicle({
        vehicleType,
        make: make.trim(),
        model: model.trim(),
        manufactureYear: Number(year),
        color: colour.trim() || undefined,
        seatCapacity: Number(seats),
        registrationNumber: plate.trim(),
      });
      navigation.navigate('UploadDocuments');
    } catch (caught) {
      // Duplicate plates and future years come back from here, not from the form: the server is
      // the only place that can see every other driver's vehicle.
      Alert.alert(
        'Could not add the vehicle',
        caught instanceof ApiError ? caught.userMessage : 'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Your vehicle"
      footer={
        <Button
          label={saving ? 'Saving...' : 'Continue'}
          disabled={Boolean(seatsError) || incomplete || saving}
          onPress={save}
        />
      }
    >
      <StepProgress current="Vehicle" />

      <ScreenTitle
        title="What are you driving?"
        subtitle="The vehicle decides which ride tiers you get offers for."
      />

      <Text style={styles.label}>Vehicle type</Text>
      <Pressable
        onPress={() => setPicking(true)}
        accessibilityRole="button"
        accessibilityLabel={`Vehicle type, ${VEHICLE_LABELS[vehicleType]}`}
        style={({ pressed }) => [styles.select, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name={VEHICLE_ICONS[vehicleType]} size={30} color={colors.primary} />
        <View style={styles.optionText}>
          <Text style={styles.optionLabel}>{VEHICLE_LABELS[vehicleType]}</Text>
          <Text style={styles.optionHint}>Up to {MAX_SEATS[vehicleType]} passengers</Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textMuted} />
      </Pressable>

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPicking(false)} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Choose vehicle type</Text>
          {TYPES.map((option) => {
            const selected = option === vehicleType;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  setVehicleType(option);
                  // Clamped rather than left invalid: switching from an SUV to a hatchback with 6 in
                  // the box would arm a disabled button with no obvious cause.
                  setSeats((current) =>
                    Number(current) > MAX_SEATS[option] ? String(MAX_SEATS[option]) : current,
                  );
                  setPicking(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  name={VEHICLE_ICONS[option]}
                  size={34}
                  color={selected ? colors.primary : colors.text}
                />
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{VEHICLE_LABELS[option]}</Text>
                  <Text style={styles.optionHint}>Up to {MAX_SEATS[option]} passengers</Text>
                </View>
                {selected ? (
                  <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>

      <TextField label="Make" value={make} onChangeText={setMake} placeholder="Toyota" icon="car-outline" autoCapitalize="words" />
      <TextField label="Model" value={model} onChangeText={setModel} placeholder="Swift Dzire" icon="car-sport-outline" autoCapitalize="words" />
      <TextField label="Year" value={year} onChangeText={setYear} placeholder="2022" icon="calendar-outline" keyboardType="number-pad" />
      <TextField label="Number Plate" value={plate} onChangeText={setPlate} placeholder="KA 05 MJ 4412" icon="pricetag-outline" autoCapitalize="none" />
      <TextField label="Colour" value={colour} onChangeText={setColour} placeholder="White" icon="color-palette-outline" autoCapitalize="words" />
      <TextField
        label="Passenger Seats"
        value={seats}
        onChangeText={setSeats}
        keyboardType="number-pad"
        icon="people-outline"
        error={seatsError}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.xl,
  },
  pressed: {
    opacity: 0.75,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm,
  },
  sheetTitle: {
    ...type.button,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  optionHint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
