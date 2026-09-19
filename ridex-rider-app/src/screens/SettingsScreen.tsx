import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getPreferences, updatePreferences } from '../api/notifications';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { ToggleRow } from '../components/ToggleRow';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

// Open Source Licenses is gone: there is no screen behind it yet.
const ABOUT_LINKS = [
  { label: 'Terms of Service', slug: 'rider-terms' },
  { label: 'Privacy Policy', slug: 'privacy-policy' },
  { label: 'Refund and Cancellation', slug: 'refund-policy' },
] as const;

export function SettingsScreen({ navigation }: Props) {
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
      <SectionLabel>NOTIFICATIONS</SectionLabel>
      <ToggleRow
        title="Push notifications"
        subtitle="Trip updates and booking news on this phone"
        value={push}
        onValueChange={(value) => change({ push: value })}
      />
      <ToggleRow
        title="Promotions"
        subtitle="Offers and bonus points"
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
          key={link.slug}
          onPress={() => navigation.navigate('Legal', { slug: link.slug })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.aboutRow, pressed && styles.pressed]}
        >
          <Text style={styles.aboutLabel}>{link.label}</Text>
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
