import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { updateProfile } from '../api/profile';
import { useSession } from '../auth/session';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const { profile, refreshProfile } = useSession();
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | undefined>();

  // The session may still be loading when the screen opens; fill in once it lands.
  useEffect(() => {
    if (!profile) {
      void refreshProfile().catch(() => undefined);
      return;
    }
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setPhone(profile.phone ?? '');
  }, [profile, refreshProfile]);

  async function save() {
    setBusy(true);
    setError(null);
    setPhoneError(undefined);
    try {
      await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
      await refreshProfile();
      navigation.goBack();
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors?.phone) {
        setPhoneError(caught.fieldErrors.phone);
      } else {
        setError(caught instanceof ApiError ? caught.userMessage : 'Could not save your profile.');
      }
    } finally {
      setBusy(false);
    }
  }

  const name = `${firstName} ${lastName}`.trim() || profile?.email || '';

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Edit Profile"
      footer={<Button label="Save Changes" onPress={() => void save()} loading={busy} disabled={busy} />}
    >
      <View style={styles.avatarBlock}>
        <Avatar name={name} size={92} brand />
      </View>

      <TextField label="First name" icon="person" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
      <TextField
        label="Last name"
        icon="person"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        style={styles.spaced}
      />
      <TextField
        label="Phone"
        icon="call"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
        error={phoneError}
        style={styles.spaced}
      />

      {/* Email is read-only here: changing it has to re-verify, which is its own flow. */}
      <Text style={styles.label}>Email</Text>
      <Text style={styles.email}>{profile?.email ?? '--'}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  label: {
    ...type.label,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  email: {
    ...type.body,
    color: colors.text,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
});
