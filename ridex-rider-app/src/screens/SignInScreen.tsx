import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ApiError } from '../api/problem';
import { useSession } from '../auth/session';

import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const { signIn } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signIn(identifier.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Home' } }] });
    } catch (caught) {
      // A wrong password and an unverified account both land here; the server decides the wording,
      // because only it can say which without leaking whether the account exists.
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen onBack={() => navigation.goBack()}>
      <ScreenTitle title="Welcome back" subtitle="Sign in to continue your journey" />

      <TextField
        label="Email"
        icon="mail"
        placeholder="you@example.com"
        value={identifier}
        onChangeText={setIdentifier}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextField
        label="Password"
        icon="lock-closed"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.spaced}
      />

      <Pressable
        onPress={() => navigation.navigate('ForgotPassword')}
        style={styles.forgotWrap}
        accessibilityRole="button"
      >
        <Text style={styles.forgot}>Forgot password?</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label={busy ? 'Signing in...' : 'Sign In'} onPress={onSignIn} disabled={busy} />

      <Text style={styles.footerText}>
        Don&apos;t have an account?{' '}
        <Text style={styles.footerLink} onPress={() => navigation.navigate('CreateAccount')}>
          Sign up
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  forgot: {
    ...type.label,
    color: colors.primary,
  },
  footerText: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  footerLink: {
    color: colors.primary,
    fontFamily: type.button.fontFamily,
  },
});
