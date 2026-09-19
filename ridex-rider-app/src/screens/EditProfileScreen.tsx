import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { getProfile, splitFullName, updateProfile } from '../api/profile';
import { useQuery } from '../api/useQuery';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { BrandLoader } from '../components/BrandLoader';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useSession } from '../auth/session';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const { refreshProfile } = useSession();
  const { data: profile, loading, error } = useQuery(getProfile, []);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Seeded once the profile lands. Editing state cannot be derived every render or a keystroke
  // would be overwritten by the last response.
  useEffect(() => {
    if (!profile) return;
    setName([profile.firstName, profile.lastName].filter(Boolean).join(' '));
    setPhone(profile.phone ?? '');
  }, [profile]);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile({ ...splitFullName(name), phone: phone.trim() });
      await refreshProfile();
      navigation.goBack();
    } catch (caught) {
      setSaveError(caught instanceof ApiError ? caught.userMessage : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !profile) {
    return (
      <Screen onBack={() => navigation.goBack()} title="Edit Profile">
        <BrandLoader size={72} label="Loading your details" style={styles.spinner} />
      </Screen>
    );
  }

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Edit Profile"
      footer={
        <Button
          label={saving ? 'Saving...' : 'Save Changes'}
          disabled={saving || name.trim().length === 0}
          onPress={save}
        />
      }
    >
      {/* No photo upload endpoint yet, so no "Change Photo" either. */}
      <View style={styles.avatarBlock}>
        <Avatar name={name} size={92} brand />
      </View>

      {error || saveError ? <Text style={styles.error}>{saveError ?? error}</Text> : null}

      <TextField label="Full Name" icon="person" value={name} onChangeText={setName} autoCapitalize="words" />

      {/* Read-only: the address is the account identifier and changing it needs re-verification,
          which is a flow of its own rather than a field on this form. */}
      <TextField
        label="Email"
        icon="mail"
        value={profile?.email ?? ''}
        editable={false}
        onChangeText={() => {}}
        style={styles.spaced}
      />
      <TextField
        label="Phone"
        icon="call"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.spaced}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginBottom: spacing.md,
  },
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
    marginBottom: spacing.sm,
  },
  genders: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gender: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
});
