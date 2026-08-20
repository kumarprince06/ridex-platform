import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');

  return (
    <Screen onBack={() => navigation.goBack()}>
      <View style={styles.badge}>
        <Ionicons name="lock-closed" size={26} color={colors.amber} />
      </View>

      <ScreenTitle
        title="Reset password"
        subtitle="Enter your email and we'll send you reset instructions."
      />

      <TextField
        label="Email Address"
        icon="mail"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.field}
      />

      <Button
        label="Send Reset Link"
        onPress={() =>
          // The inbox screen echoes the address back, so it needs whatever was typed - or a
          // stand-in while this flow is still static.
          navigation.navigate('CheckInbox', { email: email.trim() || 'your email' })
        }
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
    marginBottom: spacing.xl,
  },
});
