import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Crew } from '../api/shuttle';
import { colors, radius, spacing, type } from '../theme';

/** Who is driving and which vehicle to look for: plate first, since that's what you spot on the road. */
export function ShuttleCrewCard({ crew }: { crew: Crew }) {
  return (
    <View style={styles.card}>
      <View style={styles.plate}>
        <Text style={styles.plateText}>{crew.registrationNumber}</Text>
      </View>

      <View style={styles.text}>
        <Text style={styles.name}>{crew.driverName}</Text>
        <Text style={styles.note}>
          {crew.vehicle}
          {crew.driverRating ? ` · ${crew.driverRating}★` : ''}
        </Text>
      </View>

      {crew.driverPhone ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Call ${crew.driverName}`}
          onPress={() => Linking.openURL(`tel:${crew.driverPhone}`)}
          style={({ pressed }) => [styles.call, pressed && styles.pressed]}
        >
          <Ionicons name="call" size={18} color={colors.onPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  plate: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  plateText: {
    ...type.button,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.text,
  },
  text: {
    flex: 1,
  },
  name: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  note: {
    ...type.caption,
    color: colors.textMuted,
  },
  call: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
