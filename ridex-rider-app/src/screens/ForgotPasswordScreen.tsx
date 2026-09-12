import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { requestPasswordReset } from '../api/auth';
import { ApiError } from '../api/problem';
import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { TextField } from '../components/TextField';
import { colors, radius, spacing, type } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

/** Enough to catch a typo before a round trip. The server is what actually validates it. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = email.trim();

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(address);
      navigation.navigate('CheckInbox', { email: address });
    } catch (caught) {
      // The server answers the same whether or not the account exists - it must not confirm who
      // has one - so anything arriving here is a real failure, not "no such user".
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not send that code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen onBack={() => navigation.goBack()}>
      <View style={styles.badge}>
        <Ionicons name="lock-closed" size={26} color={colors.amber} />
      </View>

      <ScreenTitle
        title="Reset password"
        subtitle="Enter your email and we'll send you a 6-digit code."
      />

      <TextField
        label="Email Address"
        icon="mail"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.field}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={busy ? 'Sending...' : 'Send reset code'}
        // Nothing to send without an address, so the button stays muted until there is one.
        disabled={busy || !LOOKS_LIKE_EMAIL.test(address)}
        onPress={() => void send()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.amberSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
