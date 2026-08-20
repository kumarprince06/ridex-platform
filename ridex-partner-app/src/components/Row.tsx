import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, IconName, radius, spacing, type } from '../theme';

type Props = {
  icon: IconName;
  title: string;
  subtitle?: string;
  /** Tint for the icon and its tile. Defaults to the brand mint. */
  tone?: string;
  /** Small pill on the right, as on "Payment Methods — Default". */
  badge?: string;
  /** Red count bubble, as on "Notifications — 3". */
  count?: number;
  /** Replaces the chevron entirely - used for the toggle rows in Settings. */
  accessory?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  style?: ViewStyle;
};

/**
 * The icon-tile + title + subtitle + chevron row that Profile, Settings, Privacy and Saved Places
 * all repeat. Pulled out because it appears about thirty times across those screens.
 */
export function Row({
  icon,
  title,
  subtitle,
  tone = colors.primary,
  badge,
  count,
  accessory,
  onPress,
  danger = false,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && !!onPress && styles.pressed, style]}
    >
      <View style={[styles.tile, { backgroundColor: tint(danger ? colors.danger : tone) }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : tone} />
      </View>

      <View style={styles.text}>
        <Text style={[styles.title, danger && styles.danger]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}

      {count !== undefined ? (
        <View style={styles.count}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}

      {accessory ?? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
    </Pressable>
  );
}

/**
 * 18% alpha over the row background. Written as an rgba string because React Native has no
 * colour-mixing primitive and the tones are supplied as hex.
 */
function tint(hex: string) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  danger: {
    color: colors.danger,
  },
  subtitle: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.16)',
    marginRight: spacing.sm,
  },
  badgeText: {
    ...type.caption,
    fontSize: 11,
    color: colors.primary,
  },
  count: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  countText: {
    ...type.caption,
    fontSize: 11,
    color: colors.text,
  },
});
