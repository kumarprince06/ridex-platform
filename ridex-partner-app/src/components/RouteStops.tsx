import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

type Stop = { name: string; detail?: string };

type Props = {
  pickup: Stop;
  dropoff: Stop;
  /** Tighter spacing for the ride-history cards, where the pair is secondary to the fare. */
  compact?: boolean;
  style?: ViewStyle;
};

/**
 * Mint dot, connector, amber dot - the pickup/drop-off pair that appears on the history cards,
 * trip details, the receipt and the fare estimate.
 */
export function RouteStops({ pickup, dropoff, compact = false, style }: Props) {
  return (
    <View style={style}>
      <View style={styles.row}>
        <View style={styles.rail}>
          <View style={styles.dotMint} />
          <View style={[styles.connector, compact && styles.connectorCompact]} />
        </View>
        <View style={styles.text}>
          <Text style={styles.name}>{pickup.name}</Text>
          {pickup.detail ? <Text style={styles.detail}>{pickup.detail}</Text> : null}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rail}>
          <View style={styles.dotAmber} />
        </View>
        <View style={styles.text}>
          <Text style={styles.name}>{dropoff.name}</Text>
          {dropoff.detail ? <Text style={styles.detail}>{dropoff.detail}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  // Fixed-width gutter so both dots line up regardless of how tall the text beside them runs.
  rail: {
    width: 10,
    alignItems: 'center',
    paddingTop: 6,
  },
  dotMint: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  dotAmber: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
  },
  connector: {
    flex: 1,
    width: 1.5,
    minHeight: 18,
    backgroundColor: colors.border,
    marginVertical: 3,
  },
  connectorCompact: {
    minHeight: 10,
  },
  text: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  name: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  detail: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
});
