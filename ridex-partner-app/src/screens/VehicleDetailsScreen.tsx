import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { MAX_SEATS, VEHICLE_LABELS, addVehicle, type VehicleType } from '../api/vehicles';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
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
const TYPES: VehicleType[] = ['AUTO_RICKSHAW', 'HATCHBACK', 'SEDAN', 'SUV', 'MPV', 'VAN'];

export function VehicleDetailsScreen({ navigation }: Props) {
  const [vehicleType, setVehicleType] = useState<VehicleType>('SEDAN');
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
      <View style={styles.types}>
        {TYPES.map((option) => (
          <Chip
            key={option}
            label={VEHICLE_LABELS[option]}
            selected={vehicleType === option}
            onPress={() => {
              setVehicleType(option);
              // Clamped rather than left invalid: switching from an SUV to a hatchback with 6 in
              // the box would arm a disabled button with no obvious cause.
              setSeats((current) =>
                Number(current) > MAX_SEATS[option] ? String(MAX_SEATS[option]) : current,
              );
            }}
            style={styles.type}
          />
        ))}
      </View>

      <TextField label="Make" value={make} onChangeText={setMake} placeholder="Toyota" icon="car-outline" autoCapitalize="words" />
      <TextField label="Model" value={model} onChangeText={setModel} placeholder="Camry Hybrid" icon="car-sport-outline" autoCapitalize="words" />
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
  types: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  type: {
    flex: 1,
    alignItems: 'center',
  },
});
