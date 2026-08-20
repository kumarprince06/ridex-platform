import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, IconName, radius, spacing, type } from '../theme';

export type BannerTone = 'warning' | 'danger' | 'info';

type Props = {
  icon: IconName;
  title: string;
  body: string;
  tone?: BannerTone;
  actionLabel?: string;
  onPress?: () => void;
};

/**
 * Says why dispatch cannot reach this driver, and what to do about it. Every blocked state in
 * docs/22 renders through here - a spinner or a dead toggle with no explanation is the single
 * fastest way to lose a driver.
 */
export function StatusBanner({ icon, title, body, tone = 'warning', actionLabel, onPress }: Props) {
  const tint = tone === 'danger' ? colors.danger : tone === 'info' ? colors.primary : colors.warning;
  const surface =
    tone === 'danger' ? colors.dangerSurface : tone === 'info' ? colors.primarySurface : colors.amberSurface;

  return (
    <View style={[styles.banner, { backgroundColor: surface, borderColor: tint }]}>
      <Ionicons name={icon} size={20} color={tint} style={styles.icon} />

      <View style={styles.text}>
        <Text style={[styles.title, { color: tint }]}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        {actionLabel ? (
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={[styles.actionLabel, { color: tint }]}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={13} color={tint} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
  },
  title: {
    ...type.label,
  },
  body: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  actionLabel: {
    ...type.label,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
