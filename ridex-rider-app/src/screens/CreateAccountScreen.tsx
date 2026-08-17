import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

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

      <Button
        label="Create Account"
        onPress={() =>
          navigation.navigate('VerifyOtp', { phone: phone.trim() || '+1 (555) 000-0000' })
        }
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
