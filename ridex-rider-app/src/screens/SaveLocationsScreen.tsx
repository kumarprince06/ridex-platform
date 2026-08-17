import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SaveLocations'>;

export function SaveLocationsScreen({ navigation }: Props) {
  const [home, setHome] = useState('');
  const [work, setWork] = useState('');

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

      <TextField
        label="Home Address"
        icon="home"
        placeholder="Your home address"
        value={home}
        onChangeText={setHome}
        autoCapitalize="words"
        style={styles.field}
      />

      <TextField
        label="Work Address"
        icon="business"
        placeholder="Your work address"
        value={work}
        onChangeText={setWork}
        autoCapitalize="words"
        style={styles.field}
      />
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
});
