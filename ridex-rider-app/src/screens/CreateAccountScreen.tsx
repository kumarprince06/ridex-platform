import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { register } from '../api/auth';
import { ApiError } from '../api/problem';

import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAccount'>;

export function CreateAccountScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreateAccount() {
    setError(null);
    setBusy(true);
    try {
      await register(email.trim(), password);
      // Name and phone are not part of registration - they go to the profile after the account is
      // verified and signed in, which is the first moment there is a profile to write them to.
      navigation.navigate('VerifyOtp', { email: email.trim(), password });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen onBack={() => navigation.goBack()}>
      <ScreenTitle title="Create account" subtitle="Start your RideX journey today" />

      <TextField
        label="Full Name"
        icon="person"
        placeholder="Alex Johnson"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      <TextField
        label="Email Address"
        icon="mail"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.spaced}
      />

      <TextField
        label="Phone Number"
        icon="call"
        placeholder="+1 (555) 000-0000"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.spaced}
      />

      <TextField
        label="Password"
        icon="lock-closed"
        placeholder="Min 8 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.spaced}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={busy ? 'Creating...' : 'Create Account'}
        onPress={onCreateAccount}
        disabled={busy}
        style={styles.action}
      />

      <Text style={styles.footerText}>
        Already have an account?{' '}
        <Text style={styles.footerLink} onPress={() => navigation.navigate('SignIn')}>
          Sign in
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.lg,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  action: {
    marginTop: spacing.xl,
  },
  footerText: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footerLink: {
    color: colors.primary,
    fontFamily: type.button.fontFamily,
  },
});
