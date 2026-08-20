import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckInbox'>;

export function CheckInboxScreen({ navigation, route }: Props) {
  const { email } = route.params;

  return (
    <Screen onBack={() => navigation.goBack()}>
      <View style={styles.badge}>
        <Ionicons name="lock-closed" size={26} color={colors.amber} />
      </View>

      <View style={styles.center}>
        <Ionicons name="mail-unread" size={46} color={colors.primary} style={styles.envelope} />
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.body}>
          We&apos;ve sent a reset link to <Text style={styles.email}>{email}</Text>. It expires in
          15 minutes.
        </Text>

        {/* Stands in for tapping the emailed link, so the flow stays walkable on-device. */}
        <Button
          label="Open Reset Link"
          onPress={() => navigation.navigate('NewPassword')}
          style={styles.action}
        />
      </View>
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
