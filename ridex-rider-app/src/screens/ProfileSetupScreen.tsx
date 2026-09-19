import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { splitFullName, updateProfile } from '../api/profile';
import { useSession } from '../auth/session';
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
  const { refreshProfile } = useSession();
  const [displayName, setDisplayName] = useState(route.params.fullName);
  const [phone, setPhone] = useState(route.params.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ ...splitFullName(displayName), phone: phone.trim() });
      await refreshProfile();
      navigation.navigate('SaveLocations');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not save your details.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button
            label={busy ? 'Saving...' : 'Continue'}
            disabled={busy || displayName.trim().length === 0}
            onPress={() => void onContinue()}
          />
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
      <StepProgress current="Profile" />

      <Text style={styles.title}>Set up your profile</Text>

      <View style={styles.avatarBlock}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initialsOf(displayName)}</Text>
        </View>
      </View>

      <TextField label="Display Name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
      <TextField
        label="Phone Number"
        icon="call"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.field}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  field: {
    marginTop: spacing.lg,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.lg,
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
