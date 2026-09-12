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
  const { preferences: device, set: setDevice } = useDevicePreferences();

  // The server decides whether to push, so these live there. Held locally as well so a switch
  // moves the moment it is tapped rather than after a round trip.
  const { data: served } = useQuery(getPreferences);
  const [notify, setNotify] = useState<{ push: boolean; promotions: boolean } | null>(null);
  const push = notify?.push ?? served?.push ?? true;
  const promotions = notify?.promotions ?? served?.promotions ?? true;

  function change(next: { push?: boolean; promotions?: boolean }) {
    const merged = { push, promotions, ...next };
    setNotify(merged);
    void updatePreferences({ ...merged, email: served?.email ?? true }).catch(() =>
      // Put back what the server still believes: a switch that lies is worse than one that snaps
      // back.
      setNotify(null),
    );
  }

  return (
    <Screen onBack={() => navigation.goBack()} title="Settings">
      <SectionLabel>PRIVACY</SectionLabel>
      <ToggleRow
        title="Background Location"
        subtitle="Track location when app is closed"
        value={device.backgroundLocation}
        onValueChange={(value) => setDevice({ backgroundLocation: value })}
      />
      <ToggleRow
        title="Data Optimization"
        subtitle="Reduce data usage on metered connections"
        value={device.dataSaver}
        onValueChange={(value) => setDevice({ dataSaver: value })}
      />

      <SectionLabel>NOTIFICATIONS</SectionLabel>
      <ToggleRow
        title="Push notifications"
        subtitle="Trip updates and booking news on this phone"
        value={push}
        onValueChange={(value) => change({ push: value })}
      />
      <ToggleRow
        title="Promotions"
        subtitle="Deals, promo codes, and offers"
        value={promotions}
        onValueChange={(value) => change({ promotions: value })}
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
