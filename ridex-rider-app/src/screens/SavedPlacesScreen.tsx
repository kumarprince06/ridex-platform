import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  deleteSavedPlace,
  listSavedPlaces,
  savePlace,
  type SavedPlace,
} from '../api/places';
import { ApiError } from '../api/problem';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedPlaces'>;

/** The three most people want. Any other label is theirs to type. */
const SUGGESTED = ['Home', 'Work', 'Gym'];

/**
 * Home, work and anywhere else worth naming.
 *
 * <p>The place itself is picked on the map rather than typed: an address with no coordinates
 * cannot be booked to, and a rider should not have to know their own latitude.
 */
export function SavedPlacesScreen({ navigation }: Props) {
  const { data, loading, error, refetch } = useQuery(listSavedPlaces);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function remove(place: SavedPlace) {
    setNotice(null);
    try {
      await deleteSavedPlace(place.id);
      refetch();
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.userMessage : 'Could not remove that place.');
    }
  }

  async function saveFromRoute(place: { name: string; coord: [number, number] }) {
    setBusy(true);
    setNotice(null);
    try {
      await savePlace({
        label: label.trim() || place.name,
        address: place.name,
        latitude: place.coord[1],
        longitude: place.coord[0],
      });
      setLabel('');
      refetch();
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.userMessage : 'Could not save that place.');
    } finally {
      setBusy(false);
    }
  }

  const places = data ?? [];

  return (
    <Screen onBack={() => navigation.goBack()} title="Saved Places">
      {loading ? <Text style={styles.note}>Loading...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.error}>{notice}</Text> : null}

      {places.map((place) => (
        <View key={place.id} style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name={iconFor(place.label)} size={18} color={colors.primary} />
          </View>

          <View style={styles.flex}>
            <Text style={styles.label}>{place.label}</Text>
            <Text style={styles.address} numberOfLines={1}>
              {place.address}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${place.label}`}
            onPress={() => void remove(place)}
            style={styles.remove}
          >
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
          </Pressable>
        </View>
      ))}

      {places.length === 0 && !loading ? (
        <Text style={styles.note}>
          Nothing saved yet. Name a place here and it is offered the next time you book.
        </Text>
      ) : null}

      <Text style={styles.sectionLabel}>SAVE A PLACE</Text>

      <TextField
        label="Name it"
        value={label}
        onChangeText={setLabel}
        placeholder="Home, Work, Mum's..."
      />

      <View style={styles.suggestions}>
        {SUGGESTED.filter((name) => !places.some((place) => place.label === name)).map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            onPress={() => setLabel(name)}
            style={styles.suggestion}
          >
            <Text style={styles.suggestionLabel}>{name}</Text>
          </Pressable>
        ))}
      </View>

      <Button
        label={busy ? 'Saving...' : 'Pick the place on the map'}
        disabled={busy || label.trim().length === 0}
        onPress={() =>
          navigation.navigate('PickOnMap', {
            mode: 'destination',
            onPicked: (picked) => void saveFromRoute(picked),
          })
        }
        style={styles.action}
      />
    </Screen>
  );
}

/** A label picks its own glyph, so "Home" is not a generic pin. */
function iconFor(label: string) {
  const name = label.toLowerCase();
  if (name.includes('home')) return 'home' as const;
  if (name.includes('work') || name.includes('office')) return 'briefcase' as const;
  return 'bookmark' as const;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  note: {
    ...type.body,
    color: colors.textMuted,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.textFaint,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...type.body,
    color: colors.text,
  },
  address: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  remove: {
    padding: spacing.sm,
  },
  suggestions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  suggestion: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  suggestionLabel: {
    ...type.caption,
    color: colors.text,
  },
  action: {
    marginTop: spacing.lg,
  },
});
