import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { ToggleRow } from '../components/ToggleRow';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const LANGUAGES = ['English', 'Español', 'Français'];

const ABOUT_LINKS = ['Terms of Service', 'Privacy Policy', 'Open Source Licenses'];

export function SettingsScreen({ navigation }: Props) {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('English');
  const [backgroundLocation, setBackgroundLocation] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [rideUpdates, setRideUpdates] = useState(true);
  const [promotions, setPromotions] = useState(true);

  return (
    <Screen onBack={() => navigation.goBack()} title="Settings">
      <SectionLabel>APPEARANCE</SectionLabel>
      <ToggleRow
        title="Dark Mode"
        subtitle="Always-on dark theme"
        value={darkMode}
        onValueChange={setDarkMode}
      />

      <Text style={styles.label}>Language</Text>
      <View style={styles.languages}>
        {LANGUAGES.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={language === option}
            onPress={() => setLanguage(option)}
            style={styles.language}
          />
        ))}
      </View>

      <SectionLabel>PRIVACY</SectionLabel>
      <ToggleRow
        title="Background Location"
        subtitle="Track location when app is closed"
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
        title="Ride Updates"
        subtitle="Driver status, arrival alerts"
        value={rideUpdates}
        onValueChange={setRideUpdates}
      />
      <ToggleRow
        title="Promotions"
        subtitle="Deals, promo codes, and offers"
        value={promotions}
        onValueChange={setPromotions}
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
  label: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  languages: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  language: {
    flex: 1,
    alignItems: 'center',
  },
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
