import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

export type Stat = { value: string; label: string; tone?: string };

/** The three-across metric row: Distance/ETA/Traffic, ETA/Speed/Fare, Distance/Duration/Driver. */
export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.tile}>
          <Text style={[styles.value, !!stat.tone && { color: stat.tone }]}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  value: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  label: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
