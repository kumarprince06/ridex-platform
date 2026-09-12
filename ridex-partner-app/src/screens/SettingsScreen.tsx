import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getPreferences, updatePreferences } from '../api/notifications';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { ToggleRow } from '../components/ToggleRow';
import { useDevicePreferences } from '../lib/preferences';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const ABOUT_LINKS = ['Terms of Service', 'Privacy Policy', 'Open Source Licenses'];

export function SettingsScreen({ navigation }: Props) {
  const [backgroundLocation, setBackgroundLocation] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [offerAlerts, setOfferAlerts] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [payoutAlerts, setPayoutAlerts] = useState(true);

  return (
    <Screen onBack={() => navigation.goBack()} title="Settings">
      <SectionLabel>PRIVACY</SectionLabel>
      <ToggleRow
        title="Background Location"
        subtitle="Required while on duty - dispatch cannot reach you without it"
        value={backgroundLocation}
        onValueChange={setBackgroundLocation}
      />
      <ToggleRow
        title="Data Optimization"
        subtitle="Reduce data usage on metered connections"
        value={dataSaver}
        onValueChange={setDataSaver}
      />

      <SectionLabel>NOTIFICATIONS</SectionLabel>
      <ToggleRow
        title="Ride Offers"
        subtitle="Sound and vibration when an offer arrives"
        value={offerAlerts}
        onValueChange={setOfferAlerts}
      />
      <ToggleRow
        title="Payout Alerts"
        subtitle="Settlement and transfer updates"
        value={payoutAlerts}
        onValueChange={setPayoutAlerts}
      />

      <SectionLabel>DRIVING</SectionLabel>
      <ToggleRow
        title="Auto-accept Offers"
        subtitle="Accept trips matching your filters without tapping"
        value={autoAccept}
        onValueChange={setAutoAccept}
      />

      <SectionLabel>ABOUT</SectionLabel>
      <View style={styles.aboutRow}>
        <Text style={styles.aboutLabel}>App Version</Text>
        <Text style={styles.aboutValue}>0.1.0</Text>
      </View>

      {ABOUT_LINKS.map((link) => (
        <Pressable
          key={link}
          accessibilityRole="button"
          style={({ pressed }) => [styles.aboutRow, pressed && styles.pressed]}
        >
          <Text style={styles.aboutLabel}>{link}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  aboutLabel: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  aboutValue: {
    ...type.body,
    fontSize: 14,
    color: colors.textMuted,
  },
});
