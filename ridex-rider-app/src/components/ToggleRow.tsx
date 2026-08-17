import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/**
 * Settings row with a switch instead of a chevron. Uses the platform Switch rather than a
 * hand-drawn pill - it already has the press targets, animation and accessibility behaviour.
 */
export function ToggleRow({ title, subtitle, value, onValueChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        // trackColor's "false" branch is the off state; iOS ignores thumbColor when it can.
        trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
        thumbColor={value ? colors.onPrimary : colors.textMuted}
        ios_backgroundColor={colors.surfaceAlt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
  },
  title: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  subtitle: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
});
