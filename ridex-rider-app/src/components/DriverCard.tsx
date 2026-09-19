import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

type Props = { name: string; phone: string | null; rating: string | null; vehicle: string; plate: string };

/** Who is driving and which vehicle to look for: plate first, since that's what you spot on the road. */
export function DriverCard({ name, phone, rating, vehicle, plate }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.plate}>
        <Text style={styles.plateText}>{plate}</Text>
      </View>

      <View style={styles.text}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.note}>
          {vehicle}
          {rating ? ` · ${rating}★` : ''}
        </Text>
      </View>

      {phone ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Call ${name}`}
          onPress={() => Linking.openURL(`tel:${phone}`)}
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
