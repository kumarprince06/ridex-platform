import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { register, verifyEmail } from '../api/auth';
import { ApiError } from '../api/problem';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { useSession } from '../auth/session';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOtp'>;

const CODE_LENGTH = 6;
// The code itself expires in 10 minutes server-side; this only paces the resend button.
const RESEND_SECONDS = 45;

export function VerifyOtpScreen({ navigation, route }: Props) {
  const { email, password } = route.params;
  const { signIn } = useSession();
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<TextInput>(null);

  async function onVerify() {
    setError(null);
    setBusy(true);
    try {
      await verifyEmail(email, code);
      // Signing in here rather than sending them to the sign-in screen: they just proved the
      // address and typed the password a moment ago, so asking again is friction for nothing.
      if (password) {
        await signIn(email, password);
      }
      navigation.navigate('Verified');
    } catch (caught) {
      // Wrong, expired and already-used codes are one message on purpose - the server will not
      // say which, and neither should this.
      setError(caught instanceof ApiError ? caught.userMessage : 'That code did not work.');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setError(null);
    setSecondsLeft(RESEND_SECONDS);
    // Registration is idempotent from the caller's side: it answers 202 either way and issues a
    // fresh code, which is exactly what a resend needs.
    if (password) {
      await register(email, password).catch(() => setError('Could not resend the code.'));
    }
  }

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    // Without this the interval outlives the screen and keeps setting state on an unmounted tree.
    return () => clearInterval(timer);
  }, [secondsLeft]);

  return (
    <Screen onBack={() => navigation.goBack()}>
      <View style={styles.badge}>
        <Ionicons name="call" size={26} color={colors.primary} />
      </View>

      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>
        We&apos;ve sent a {CODE_LENGTH}-digit code to <Text style={styles.phone}>{email}</Text>
      </Text>

      {/*
        The boxes are decoration over one real TextInput, rather than the custom keypad the mockup
        drew. Only a genuine input can receive a one-time code from the OS: autoComplete="sms-otp"
        on Android and textContentType="oneTimeCode" on iOS put the code one tap away. A hand-rolled
        keypad also loses paste, password managers, hardware keyboards and screen readers.
      */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="button"
        accessibilityLabel={`Verification code, ${code.length} of ${CODE_LENGTH} digits entered`}
        style={styles.codeRow}
      >
        {Array.from({ length: CODE_LENGTH }).map((_, index) => {
          // Only the box awaiting input is lit, and only while the field has focus - a filled box
          // is done, so keeping it highlighted would leave the whole row lit at the end.
          const isCursor = focused && index === Math.min(code.length, CODE_LENGTH - 1);

          return (
            <View key={index} style={[styles.codeBox, isCursor && styles.codeBoxActive]}>
              <Text style={styles.codeDigit}>{code[index] ?? ''}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={code}
        // Strip anything the keyboard or an autofill payload sneaks in that is not a digit.
        onChangeText={(next) => setCode(next.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        autoFocus
        style={styles.hiddenInput}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={busy ? 'Verifying...' : 'Verify Code'}
        disabled={busy || code.length < CODE_LENGTH}
        onPress={onVerify}
      />

      <Text style={styles.resend}>
        Didn&apos;t receive the code?{' '}
        {secondsLeft > 0 ? (
          <Text style={styles.resendTimer}>
            Resend in {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, '0')}
          </Text>
        ) : (
          <Text style={styles.resendTimer} onPress={onResend}>
            Resend now
          </Text>
        )}
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
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...type.title,
    color: colors.text,
  },
  subtitle: {
    ...type.subtitle,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  phone: {
    color: colors.text,
    fontFamily: type.button.fontFamily,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  codeBox: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: {
    borderColor: colors.primary,
  },
  codeDigit: {
    ...type.title,
    fontSize: 22,
    color: colors.text,
  },
  /*
   * Off-screen rather than display:none or width 0. Android skips autofill on a field it considers
   * invisible, and an unmounted-looking input cannot hold focus to drive the keyboard.
   */
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: -9999,
    height: 1,
    width: 1,
  },
  resend: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  resendTimer: {
    color: colors.primary,
    fontFamily: type.button.fontFamily,
  },
});
