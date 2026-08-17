import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonalDetails'>;

const GENDERS = ['Male', 'Female', 'Other'] as const;

export function PersonalDetailsScreen({ navigation }: Props) {
  const [gender, setGender] = useState<(typeof GENDERS)[number] | null>(null);
  const [dob, setDob] = useState('');

  return (
    <Screen
      footer={
        <>
          <Button label="Continue" onPress={() => navigation.navigate('SaveLocations')} />
          <Pressable
            onPress={() => navigation.navigate('SaveLocations')}
            style={styles.skipWrap}
            accessibilityRole="button"
          >
            <Text style={styles.skip}>Skip for now</Text>
          </Pressable>
        </>
      }
    >
      <StepProgress current="Personal" />

      <Text style={styles.title}>Tell us about you</Text>

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((option) => {
          const selected = gender === option;
          return (
            <Pressable
              key={option}
              onPress={() => setGender(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.genderChip, selected && styles.genderChipSelected]}
            >
              <Text style={[styles.genderLabel, selected && styles.genderLabelSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/*
        Plain text entry rather than a native date picker: that needs @react-native-community
        /datetimepicker, and the static pass does not justify the dependency yet.
      */}
      <TextField
        label="Date of Birth"
        placeholder="mm/dd/yyyy"
        icon="calendar-outline"
        value={dob}
        onChangeText={setDob}
        keyboardType="numbers-and-punctuation"
        style={styles.field}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  label: {
    ...type.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderChip: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(46, 231, 199, 0.12)',
  },
  genderLabel: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  genderLabelSelected: {
    color: colors.primary,
  },
  field: {
    marginTop: spacing.xl,
  },
  skipWrap: {
    alignSelf: 'center',
    paddingVertical: spacing.lg,
  },
  skip: {
    ...type.button,
    fontSize: 15,
    color: colors.textMuted,
  },
});
