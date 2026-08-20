import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Screen, ScreenTitle } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { TextField } from '../components/TextField';
import { RootScreenProps } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = RootScreenProps<'VehicleDetails'>;

/** Mirrors VehicleType in the backend. Seat count is validated per type, not as a flat 1..64. */
const TYPES = [
  { id: 'GO', label: 'Go', seats: 4 },
  { id: 'COMFORT', label: 'Comfort', seats: 4 },
  { id: 'XL', label: 'XL', seats: 6 },
];

export function VehicleDetailsScreen({ navigation }: Props) {
  const [type, setType] = useState('COMFORT');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [seats, setSeats] = useState('4');

  const limit = TYPES.find((option) => option.id === type)?.seats ?? 4;
  const seatsError =
    seats && Number(seats) > limit ? `A ${type.toLowerCase()} vehicle seats at most ${limit}.` : undefined;

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Your vehicle"
      footer={
        <Button
          label="Continue"
          disabled={Boolean(seatsError)}
          onPress={() => navigation.navigate('UploadDocuments')}
        />
      }
    >
      <StepProgress current="Vehicle" />

      <ScreenTitle
        title="What are you driving?"
        subtitle="The vehicle decides which ride tiers you get offers for."
      />

      <Text style={styles.label}>Ride tier</Text>
      <View style={styles.types}>
        {TYPES.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            selected={type === option.id}
            onPress={() => setType(option.id)}
            style={styles.type}
          />
        ))}
      </View>

      <TextField label="Make" value={make} onChangeText={setMake} placeholder="Toyota" icon="car-outline" autoCapitalize="words" />
      <TextField label="Model" value={model} onChangeText={setModel} placeholder="Camry Hybrid" icon="car-sport-outline" autoCapitalize="words" />
      <TextField label="Year" value={year} onChangeText={setYear} placeholder="2022" icon="calendar-outline" keyboardType="number-pad" />
      <TextField label="Number Plate" value={plate} onChangeText={setPlate} placeholder="KA 05 MJ 4412" icon="pricetag-outline" autoCapitalize="none" />
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
