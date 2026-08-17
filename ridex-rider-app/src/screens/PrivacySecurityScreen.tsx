import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacySecurity'>;

export function PrivacySecurityScreen({ navigation }: Props) {
  const [twoFactor, setTwoFactor] = useState(false);
  const [biometric, setBiometric] = useState(true);

  return (
    <Screen onBack={() => navigation.goBack()} title="Privacy & Security">
      <SectionLabel>SECURITY</SectionLabel>

      <View style={styles.group}>
        <Row
          icon="lock-closed"
          title="Two-Factor Auth"
          subtitle="Extra login security"
          tone="#E0B252"
          accessory={<Toggle value={twoFactor} onValueChange={setTwoFactor} />}
        />
        <Row
          icon="finger-print"
          title="Biometric Login"
          subtitle="Face ID / Fingerprint"
          tone="#E0B252"
          accessory={<Toggle value={biometric} onValueChange={setBiometric} />}
        />
      </View>

      <View style={styles.group}>
        <Row icon="key" title="Change Password" subtitle="Last changed 3 months ago" tone="#E0B252" />
        <Row icon="phone-portrait" title="Trusted Devices" subtitle="2 devices logged in" tone="#8FA0BF" />
        <Row icon="document-text" title="Login History" subtitle="View recent sign-ins" tone="#8FA0BF" />
      </View>

      <SectionLabel>PRIVACY</SectionLabel>

      <View style={styles.group}>
        <Row icon="bar-chart" title="Your Data" subtitle="Download your RideX data" tone="#5FB8D6" />
        <Row
          icon="trash"
          title="Delete Account"
          subtitle="Permanently remove your account"
          danger
        />
      </View>
    </Screen>
  );
}

function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
      thumbColor={value ? colors.onPrimary : colors.textMuted}
      ios_backgroundColor={colors.surfaceAlt}
    />
  );
}

const styles = StyleSheet.create({
  // Rows are banded into cards here, unlike Profile where they run flush against the background.
  group: {
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
});
