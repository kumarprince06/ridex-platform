import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  /** Dashed line from the pickup pin to the destination pin. */
  showRoute?: boolean;
  /** Driver puck position along that line, 0 at pickup and 1 at the destination. */
  driverAt?: number;
  driverLabel?: string;
  /** The lone "You are here" dot, used before a destination is chosen. */
  showUserDot?: boolean;
  pickupLabel?: string;
  destinationLabel?: string;
  style?: ViewStyle;
};

/*
 * Stand-in for the map across the whole booking flow. Real tiles arrive with the maps provider;
 * until then a ruled grid plus pins reads as a map without react-native-maps or an API key.
 *
 * Pin positions are percentages of this container, so the same component works whether it is the
 * full screen or a 180pt strip on Trip Details.
 */
const PICKUP = { left: '26%', top: '68%' } as const;
const DESTINATION = { left: '62%', top: '22%' } as const;

export function MapCanvas({
  showRoute = false,
  driverAt,
  driverLabel,
  showUserDot = false,
  pickupLabel = 'Pickup',
  destinationLabel = 'Destination',
  style,
}: Props) {
  return (
    <View style={[styles.map, style]}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={`h${index}`} style={[styles.gridLine, { top: `${(index + 1) * 16}%` }]} />
      ))}
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={`v${index}`} style={[styles.gridV, { left: `${(index + 1) * 20}%` }]} />
      ))}

      {/* Park block, purely so the grid does not read as graph paper. */}
      <View style={styles.park} />

      {showRoute ? <View style={styles.route} /> : null}

      {showUserDot ? (
        <View style={[styles.pinWrap, PICKUP]}>
          <View style={styles.halo} />
          <View style={styles.userDot} />
          <Label text="You are here" />
        </View>
      ) : null}

      {showRoute ? (
        <>
          <View style={[styles.pinWrap, PICKUP]}>
            <View style={styles.halo} />
            <View style={styles.pickupRing}>
              <View style={styles.pickupCore} />
            </View>
            <Label text={pickupLabel} />
          </View>

          <View style={[styles.pinWrap, DESTINATION]}>
            <View style={styles.destPin}>
              <Ionicons name="location" size={15} color="#2B1A05" />
            </View>
            <Label text={destinationLabel} tone="amber" />
          </View>
        </>
      ) : null}

      {driverAt !== undefined ? (
        <View
          style={[
            styles.pinWrap,
            // Linear interpolation between the two pin positions. Good enough for a straight
            // dashed route; a real polyline replaces this with the provider's geometry.
            {
              left: `${26 + (62 - 26) * driverAt}%`,
              top: `${68 - (68 - 22) * driverAt}%`,
            },
          ]}
        >
          <View style={styles.driverPuck}>
            <Ionicons name="car" size={13} color={colors.onPrimary} />
          </View>
          {driverLabel ? <Label text={driverLabel} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function Label({ text, tone = 'mint' }: { text: string; tone?: 'mint' | 'amber' }) {
  return (
    <View style={[styles.label, tone === 'amber' && styles.labelAmber]}>
      <Text style={[styles.labelText, tone === 'amber' && styles.labelTextAmber]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0E1524',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  park: {
    position: 'absolute',
    left: '40%',
    top: '38%',
    width: '22%',
    height: '18%',
    backgroundColor: 'rgba(46, 231, 199, 0.05)',
  },
  /*
   * The route is one rotated View with a dashed top border, not a real polyline. React Native has
   * no line primitive without react-native-svg, and a straight dash conveys the path well enough
   * for a static pass.
   */
  route: {
    position: 'absolute',
    left: '22%',
    top: '46%',
    width: '46%',
    borderTopWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    transform: [{ rotate: '-52deg' }],
  },
  pinWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.12)',
    top: -22,
  },
  userDot: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primarySurface,
  },
  pickupRing: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySurface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupCore: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  destPin: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPuck: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySurface,
  },
  labelAmber: {
    backgroundColor: colors.amberSurface,
  },
  labelText: {
    ...type.caption,
    fontSize: 9,
    color: colors.primary,
  },
  labelTextAmber: {
    color: colors.amber,
  },
});
