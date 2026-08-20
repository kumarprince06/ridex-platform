import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  online: boolean;
  onToggle: () => void;
  /** Blocks going online and says why - an expired document, a denied permission, a suspension. */
  blockedReason?: string;
};

/**
 * The app's most-pressed control, so it is the biggest thing on the screen when off duty and
 * shrinks out of the way when on duty. A driver taps this at the start and end of a shift and
 * must never hit it by accident in between.
 */
export function DutyToggle({ online, onToggle, blockedReason }: Props) {
  const blocked = !online && Boolean(blockedReason);

  return (
    <View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: online, disabled: blocked }}
        accessibilityLabel={online ? 'Go offline' : 'Go online'}
        accessibilityHint={blockedReason}
        disabled={blocked}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.base,
          online ? styles.offlineAction : styles.onlineAction,
          blocked && styles.blocked,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name={online ? 'pause' : 'power'}
          size={online ? 18 : 22}
          color={online ? colors.text : colors.onPrimary}
        />
        <Text style={[styles.label, online ? styles.offlineLabel : styles.onlineLabel]}>
          {online ? 'Go offline' : 'Go online'}
        </Text>
      </Pressable>

      {blocked ? <Text style={styles.reason}>{blockedReason}</Text> : null}
    </View>
  );
}

/** The small live/offline pill that rides in the map header. */
export function DutyPill({ online }: { online: boolean }) {
  return (
    <View style={[styles.pill, online ? styles.pillOnline : styles.pillOffline]}>
      <View style={[styles.dot, { backgroundColor: online ? colors.online : colors.offline }]} />
      <Text style={[styles.pillLabel, { color: online ? colors.online : colors.textMuted }]}>
        {online ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
  },
  onlineAction: {
    // Off duty: full-size, unmissable.
    minHeight: 64,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
  },
  offlineAction: {
    // On duty: deliberately small and quiet, so a thumb resting on the sheet cannot end a shift.
    minHeight: 44,
    alignSelf: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  blocked: {
    backgroundColor: colors.primaryMuted,
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...type.button,
  },
  onlineLabel: {
    fontSize: 18,
    color: colors.onPrimary,
  },
  offlineLabel: {
    fontSize: 14,
    color: colors.text,
  },
  reason: {
    ...type.caption,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillOnline: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primaryMuted,
  },
  pillOffline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillLabel: {
    ...type.label,
    fontSize: 12,
  },
});
