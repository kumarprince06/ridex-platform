import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NewPassword'>;

const MIN_LENGTH = 8;

export function NewPasswordScreen({ navigation }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Only complain once there is something to compare - showing "don't match" against an empty
  // second field would flag every user mid-keystroke.
  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const canSubmit = password.length >= MIN_LENGTH && password === confirm;

  return (
    <Screen onBack={() => navigation.goBack()}>
      <ScreenTitle title="New password" subtitle="Choose a strong password for your account." />

      <TextField
        label="New Password"
        icon="lock-closed"
        placeholder={`Min ${MIN_LENGTH} characters`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={tooShort ? `Use at least ${MIN_LENGTH} characters` : undefined}
      />

      <TextField
        label="Confirm Password"
        icon="lock-closed"
        placeholder="Repeat your password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        error={mismatch ? "Passwords don't match" : undefined}
        style={styles.spaced}
      />

      <Button
        label="Update Password"
        disabled={!canSubmit}
        onPress={() => navigation.navigate('SignIn')}
        style={styles.action}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaced: {
    marginTop: spacing.lg,
  },
  action: {
    marginTop: spacing.xl,
  },
});
