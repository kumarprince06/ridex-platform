import Constants from 'expo-constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getPreferences, updatePreferences, type NotificationPreferences } from '../api/notifications';
import { ApiError } from '../api/problem';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { ToggleRow } from '../components/ToggleRow';
import { useDevicePreferences } from '../lib/preferences';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const LEGAL_LINKS = [
  { label: 'Partner Terms', slug: 'partner-terms' },
  { label: 'Privacy Policy', slug: 'privacy-policy' },
] as const;

export function SettingsScreen({ navigation }: Props) {
  const device = useDevicePreferences();
  const { data } = useQuery(getPreferences);
  const [notify, setNotify] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setNotify(data);
    }
  }, [data]);

  // Optimistic, and put back if the server says no - a switch that lies is worse than a slow one.
  async function change(patch: Partial<NotificationPreferences>) {
    if (!notify) {
      return;
    }
    const previous = notify;
    const next = { ...notify, ...patch };
    setNotify(next);
    setError(null);
    try {
      setNotify(await updatePreferences(next));
    } catch (caught) {
      setNotify(previous);
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not save that setting.');
    }
  }

  return (
    <Screen onBack={() => navigation.goBack()} title="Settings">
      <SectionLabel>ON THIS PHONE</SectionLabel>
      <ToggleRow
        title="Background Location"
        subtitle="Required while on duty - dispatch cannot reach you without it"
        value={device.preferences.backgroundLocation}
        onValueChange={(value) => device.set({ backgroundLocation: value })}
      />
      <ToggleRow
        title="Data Optimization"
        subtitle="Reduce data usage on metered connections"
        value={device.preferences.dataSaver}
        onValueChange={(value) => device.set({ dataSaver: value })}
      />

      <SectionLabel>NOTIFICATIONS</SectionLabel>
      {notify ? (
        <>
          <ToggleRow
            title="Push notifications"
            subtitle="Trip, payout and account updates on this phone"
            value={notify.push}
            onValueChange={(value) => void change({ push: value })}
          />
          <ToggleRow
            title="Email updates"
            subtitle="Payout statements and account changes"
            value={notify.email}
            onValueChange={(value) => void change({ email: value })}
          />
          <ToggleRow
            title="Offers and promotions"
            subtitle="Incentives and bonus programmes"
            value={notify.promotions}
            onValueChange={(value) => void change({ promotions: value })}
          />
        </>
      ) : (
        <Text style={styles.muted}>Loading...</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SectionLabel>ABOUT</SectionLabel>
      <View style={styles.aboutRow}>
        <Text style={styles.aboutLabel}>App Version</Text>
        <Text style={styles.aboutValue}>{Constants.expoConfig?.version ?? '--'}</Text>
      </View>

      {LEGAL_LINKS.map((link) => (
        <Pressable
          key={link.slug}
          accessibilityRole="button"
          onPress={() => navigation.navigate('Legal', { slug: link.slug })}
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
  muted: {
    ...type.body,
    color: colors.textMuted,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  aboutValue: {
    ...type.body,
    fontSize: 14,
    color: colors.textMuted,
  },
});
