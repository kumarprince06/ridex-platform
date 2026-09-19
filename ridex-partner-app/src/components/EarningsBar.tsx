import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  net: string;
  detail: string;
  label?: string;
};

/** Today's net. Net, never gross - gross is not spendable. */
export function EarningsBar({ net, detail, label = 'Today' }: Props) {

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.net}>{net}</Text>
      </View>

      <Text style={styles.detail}>{detail}</Text>
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
  detail: {
    ...type.caption,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 6,
  },
});
