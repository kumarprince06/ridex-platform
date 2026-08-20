import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  net: string;
  goal: string;
  /** 0..1. Clamped, because a driver past their goal must not overflow the track. */
  progress: number;
  label?: string;
};

/** Today's net against the driver's own goal. Net, never gross - gross is not spendable. */
export function EarningsBar({ net, goal, progress, label = 'Today' }: Props) {
  const filled = Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.net}>{net}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { flex: filled }]} />
        <View style={{ flex: 1 - filled }} />
      </View>

      <Text style={styles.goal}>
        {Math.round(filled * 100)}% of {goal} goal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  label: {
    ...type.caption,
    color: colors.textMuted,
  },
  net: {
    ...type.button,
    fontSize: 18,
    color: colors.text,
  },
  track: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: {
    backgroundColor: colors.success,
  },
  goal: {
    ...type.caption,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 6,
  },
});
