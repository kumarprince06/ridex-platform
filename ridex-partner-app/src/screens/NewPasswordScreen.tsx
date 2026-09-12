import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ApiError } from '../api/problem';
import { resetPassword } from '../api/auth';
import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { TextField } from '../components/TextField';
import { colors, spacing, type } from '../theme';
import { RootScreenProps } from '../navigation/types';

type Props = RootScreenProps<'NewPassword'>;

const MIN_LENGTH = 8;
const CODE_LENGTH = 6;

export function NewPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only complain once there is something to compare - showing "don't match" against an empty
  // second field would flag every user mid-keystroke.
  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const canSubmit =
    code.length === CODE_LENGTH && password.length >= MIN_LENGTH && password === confirm;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await resetPassword(email, code, password);
      // Replaced, not pushed: going "back" into a spent reset code helps nobody.
      navigation.replace('SignIn');
    } catch (caught) {
      // "That code is not correct" and "this code has expired" both arrive here, and both are
      // exactly what somebody staring at their inbox needs to read.
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not reset that password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen onBack={() => navigation.goBack()}>
      <ScreenTitle title="New password" subtitle={`Enter the code sent to ${email}.`} />

      <TextField
        label="Reset code"
        icon="keypad"
        placeholder="000000"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
      />

      <TextField
        label="New Password"
        icon="lock-closed"
        placeholder={`Min ${MIN_LENGTH} characters`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={tooShort ? `Use at least ${MIN_LENGTH} characters` : undefined}
        style={styles.spaced}
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={busy ? 'Updating...' : 'Update Password'}
        disabled={!canSubmit || busy}
        onPress={() => void submit()}
        style={styles.action}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaced: {
    marginTop: spacing.lg,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  action: {
    marginTop: spacing.xl,
  },
});
