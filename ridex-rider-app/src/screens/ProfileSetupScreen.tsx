import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

/** "Alex Johnson" -> "AJ". Falls back to a single glyph so the avatar is never empty. */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function ProfileSetupScreen({ navigation, route }: Props) {
  const [displayName, setDisplayName] = useState(route.params.fullName);

  return (
    <Screen
      footer={
        <>
          <Button label="Continue" onPress={() => navigation.navigate('PersonalDetails')} />
          <Pressable
            onPress={() => navigation.navigate('PersonalDetails')}
            style={styles.skipWrap}
            accessibilityRole="button"
          >
            <Text style={styles.skip}>Skip for now</Text>
          </Pressable>
        </>
      }
    >
      <StepProgress current="Profile" />

      <Text style={styles.title}>Set up your profile</Text>

      <View style={styles.avatarBlock}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initialsOf(displayName)}</Text>
          {/* Static: no image picker wired up until the app talks to storage. */}
          <View style={styles.cameraChip}>
            <Ionicons name="camera" size={15} color={colors.onPrimary} />
          </View>
        </View>
        <Text style={styles.avatarHint}>Tap to add a profile photo</Text>
      </View>

      <TextField label="Display Name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: '#2A3350',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...type.hero,
    fontSize: 34,
    color: colors.text,
  },
  cameraChip: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
  },
  avatarHint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
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
