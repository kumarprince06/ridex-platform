import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';
import { Avatar } from './Avatar';

type Props = {
  name: string;
  rating: number;
  note: string;
};

/**
 * Rider identity plus the two ways to reach them, on every screen from accept to drop-off.
 * Call and message are 48pt targets because they get used at the kerb, one-handed.
 */
export function RiderBar({ name, rating, note }: Props) {
  return (
    <View style={styles.bar}>
      <Avatar name={name} size={48} />

      <View style={styles.text}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={12} color={colors.primary} />
          <Text style={styles.meta}>
            {rating} · {note}
          </Text>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={`Message ${name}`} style={styles.action}>
        <Ionicons name="chatbubble-ellipses" size={19} color={colors.text} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Call ${name}`} style={[styles.action, styles.call]}>
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
});
