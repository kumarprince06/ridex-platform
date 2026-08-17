import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const GENDERS = ['Male', 'Female', 'Other'];

export function EditProfileScreen({ navigation }: Props) {
  const [name, setName] = useState('Alex Johnson');
  const [email, setEmail] = useState('alex@example.com');
  const [phone, setPhone] = useState('+1 (555) 203-4471');
  const [gender, setGender] = useState('Male');

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Edit Profile"
      footer={<Button label="Save Changes" onPress={() => navigation.goBack()} />}
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

      <TextField label="Full Name" icon="person" value={name} onChangeText={setName} autoCapitalize="words" />
      <TextField
        label="Email"
        icon="mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
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

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genders}>
        {GENDERS.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={gender === option}
            onPress={() => setGender(option)}
            style={styles.gender}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
