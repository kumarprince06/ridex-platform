import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen onBack={() => navigation.goBack()}>
      <ScreenTitle title="Welcome back" subtitle="Sign in to continue your journey" />

      <TextField
        label="Email or Phone"
        icon="mail"
        placeholder="you@example.com"
        value={identifier}
        onChangeText={setIdentifier}
        keyboardType="email-address"
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

      {/* Static flow: no credential check, straight to the signed-in surface. */}
      <Button label="Sign In" onPress={() => navigation.navigate('MainTabs', { screen: 'Drive' })} />

      <View style={styles.dividerRow}>
        <View style={styles.rule} />
        <Text style={styles.dividerLabel}>or continue with</Text>
        <View style={styles.rule} />
      </View>

      <View style={styles.socialRow}>
        <View style={styles.socialButton}>
          <Ionicons name="logo-google" size={17} color={colors.text} />
          <Text style={styles.socialLabel}>Google</Text>
        </View>
        <View style={styles.socialButton}>
          <Ionicons name="logo-apple" size={17} color={colors.text} />
          <Text style={styles.socialLabel}>Apple</Text>
        </View>
      </View>

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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialLabel: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
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
