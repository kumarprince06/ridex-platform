import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';
import { Avatar } from './Avatar';

type Props = {
  name: string;
  /** Null until the rider has been rated. Better blank than a number nobody earned. */
  rating?: number | null;
  note: string;
  /** Null when the rider has no number on file - the buttons dim rather than dial nothing. */
  phone?: string | null;
};

/**
 * Rider identity plus the two ways to reach them, on every screen from accept to drop-off.
 * Call and message are 48pt targets because they get used at the kerb, one-handed.
 */
export function RiderBar({ name, rating, note, phone }: Props) {
  return (
    <View style={styles.bar}>
      <Avatar name={name} size={48} />

      <View style={styles.text}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.metaRow}>
          {rating == null ? null : (
            <Ionicons name="star" size={12} color={colors.primary} />
          )}
          <Text style={styles.meta}>{rating == null ? note : `${rating} · ${note}`}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Message ${name}`}
        disabled={!phone}
        onPress={() => phone && void Linking.openURL(`sms:${phone}`)}
        style={[styles.action, !phone && styles.disabled]}
      >
        <Ionicons name="chatbubble-ellipses" size={19} color={colors.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Call ${name}`}
        disabled={!phone}
        onPress={() => phone && void Linking.openURL(`tel:${phone}`)}
        style={[styles.action, styles.call, !phone && styles.disabled]}
      >
        <Ionicons name="call" size={19} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  name: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  meta: {
    ...type.caption,
    color: colors.textMuted,
  },
  action: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  call: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.4,
  },
});
