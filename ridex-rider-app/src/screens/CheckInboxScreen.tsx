import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { requestPasswordReset } from '../api/auth';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckInbox'>;

/** The code lives ten minutes server-side; this only paces the button. */
const RESEND_AFTER_SECONDS = 30;

export function CheckInboxScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER_SECONDS);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setInterval(() => setSecondsLeft((left) => left - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  async function resend() {
    setNotice(null);
    // The same call as the first one: the server issues a fresh code and expires the old one.
    await requestPasswordReset(email).catch(() => undefined);
    setSecondsLeft(RESEND_AFTER_SECONDS);
    setNotice('A new code is on its way.');
  }

  return (
    <Screen onBack={() => navigation.goBack()}>
      <View style={styles.badge}>
        <Ionicons name="lock-closed" size={26} color={colors.amber} />
      </View>

      <View style={styles.center}>
        <Ionicons name="mail-unread" size={46} color={colors.primary} style={styles.envelope} />
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.body}>
          We&apos;ve sent a 6-digit code to <Text style={styles.email}>{email}</Text>. It expires
          in 10 minutes.
        </Text>

        <Text style={styles.resend}>
          {secondsLeft > 0 ? (
            `Didn't get it? Resend in ${secondsLeft}s`
          ) : (
            <Text style={styles.resendAction} onPress={() => void resend()}>
              Resend the code
            </Text>
          )}
        </Text>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Button
          label="I have the code"
          // The address goes with it: the server checks the code against an account, not a session.
          onPress={() => navigation.navigate('NewPassword', { email })}
          style={styles.action}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resend: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  resendAction: {
    ...type.caption,
    color: colors.primary,
  },
  notice: {
    ...type.caption,
    color: colors.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.amberSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    marginTop: spacing.xxl * 2,
    alignItems: 'center',
  },
  envelope: {
    marginBottom: spacing.xl,
  },
  title: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...type.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  email: {
    color: colors.text,
    fontFamily: type.button.fontFamily,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
});
