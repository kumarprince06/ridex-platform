import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { SAVED_PLACES } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedPlaces'>;

export function SavedPlacesScreen({ navigation }: Props) {
  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Saved Places"
      headerRight={<Text style={styles.add}>+ Add</Text>}
    >
      {SAVED_PLACES.map((place, index) => (
        <View
          key={place.name}
          // The first entry is highlighted in the mockup as the default pickup.
          style={[styles.place, index === 0 && styles.placePrimary]}
        >
          <View style={[styles.icon, { backgroundColor: `${place.tone}2E` }]}>
            <Ionicons name={place.icon} size={19} color={place.tone} />
          </View>

          <View style={styles.flex}>
            <Text style={styles.name}>{place.name}</Text>
            <Text style={styles.address} numberOfLines={1}>
              {place.address}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${place.name}`}
            style={styles.editChip}
          >
            <Ionicons name="create-outline" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.addNew, pressed && styles.pressed]}
      >
        <View style={styles.addNewIcon}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </View>
        <Text style={styles.addNewText}>Add New Place</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  add: {
    ...type.button,
    fontSize: 14,
    color: colors.primary,
    textAlign: 'right',
    width: 60,
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  placePrimary: {
    borderColor: 'rgba(46, 231, 199, 0.35)',
    backgroundColor: 'rgba(46, 231, 199, 0.06)',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  address: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  editChip: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  addNewIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewText: {
    ...type.button,
    fontSize: 15,
    color: colors.primary,
  },
});
