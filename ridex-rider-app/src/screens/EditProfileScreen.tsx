import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { getProfile, updateProfile } from '../api/profile';
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
      // One name field, two columns. Everything past the first space is the last name, which is
      // wrong for some names and right for most - the alternative is asking twice.
      const trimmed = name.trim();
      const cut = trimmed.indexOf(' ');
      await updateProfile({
        firstName: cut === -1 ? trimmed : trimmed.slice(0, cut),
        lastName: cut === -1 ? '' : trimmed.slice(cut + 1).trim(),
        phone: phone.trim(),
      });
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
      <View style={styles.avatarBlock}>
        <View>
          <Avatar name={name} size={92} brand />
          <View style={styles.cameraChip}>
            <Ionicons name="camera" size={15} color={colors.onPrimary} />
          </View>
        </View>
        <Text style={styles.changePhoto}>Change Photo</Text>
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
    marginTop: spacing.xl,
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
  cameraChip: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
  },
  changePhoto: {
    ...type.button,
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.md,
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
