import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { savePlace } from '../api/places';
import { ApiError } from '../api/problem';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SaveLocations'>;

const LABELS = ['Home', 'Work'] as const;

export function SaveLocationsScreen({ navigation }: Props) {
  const [saved, setSaved] = useState<Partial<Record<(typeof LABELS)[number], string>>>({});
  const [error, setError] = useState<string | null>(null);

  // Picked on the map, not typed: a saved place needs coordinates to be bookable.
  function pick(label: (typeof LABELS)[number]) {
    navigation.navigate('PickOnMap', {
      mode: 'destination',
      onPicked: (picked) => {
        setError(null);
        savePlace({
          label,
          address: picked.name,
          latitude: picked.coord[1],
          longitude: picked.coord[0],
        })
          .then(() => setSaved((prev) => ({ ...prev, [label]: picked.name })))
          .catch((caught) =>
            setError(caught instanceof ApiError ? caught.userMessage : `Could not save ${label}.`),
          );
      },
    });
  }

  return (
    <Screen
      footer={
        // Resets the stack: the setup flow is done and must not be reachable by swiping back.
        <Button
          label="Let's Go!"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
        />
      }
    >
      <StepProgress current="Location" />

      <Text style={styles.title}>Save your locations</Text>
      <Text style={styles.subtitle}>Add your home and work locations for faster booking.</Text>

      {LABELS.map((label) => (
        <Button
          key={label}
          label={saved[label] ? `${label}: ${saved[label]}` : `Set ${label} on the map`}
          variant="secondary"
          onPress={() => pick(label)}
          style={styles.field}
        />
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    color: colors.text,
  },
  subtitle: {
    ...type.subtitle,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  field: {
    marginTop: spacing.xl,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.lg,
  },
});
