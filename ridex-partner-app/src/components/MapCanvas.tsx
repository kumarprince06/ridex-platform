import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  showRoute?: boolean;
  driverAt?: number;
  driverLabel?: string;
  showUserDot?: boolean;
  pickupLabel?: string;
  destinationLabel?: string;
  style?: ViewStyle;
};

const PICKUP_COORD = { latitude: 12.9716, longitude: 77.5946 };
const DESTINATION_COORD = { latitude: 12.9848, longitude: 77.5914 };
const USER_COORD = { latitude: 12.9729, longitude: 77.5933 };

export function MapCanvas({
  showRoute = false,
  driverAt,
  driverLabel,
  showUserDot = false,
  pickupLabel = 'Pickup',
  destinationLabel = 'Destination',
  style,
}: Props) {
  const driverCoord =
    driverAt === undefined
      ? undefined
      : {
          latitude: PICKUP_COORD.latitude + (DESTINATION_COORD.latitude - PICKUP_COORD.latitude) * driverAt,
          longitude: PICKUP_COORD.longitude + (DESTINATION_COORD.longitude - PICKUP_COORD.longitude) * driverAt,
        };

  return (
    <View style={[styles.map, style]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          ...PICKUP_COORD,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsCompass={false}
        showsTraffic={false}
        mapType="standard"
      >
        {showRoute ? (
          <Polyline
            coordinates={[PICKUP_COORD, DESTINATION_COORD]}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[8, 8]}
          />
        ) : null}

        {showUserDot ? (
          <Marker coordinate={USER_COORD}>
            <View style={styles.userMarker} />
          </Marker>
        ) : null}

        {showRoute ? (
          <>
            <Marker coordinate={PICKUP_COORD}>
              <View style={styles.pickupMarker}>
                <View style={styles.pickupCore} />
              </View>
            </Marker>

            <Marker coordinate={DESTINATION_COORD}>
              <View style={styles.destMarker}>
                <Ionicons name="location" size={14} color="#2B1A05" />
              </View>
            </Marker>
          </>
        ) : null}

        {driverCoord ? (
          <Marker coordinate={driverCoord}>
            <View style={styles.driverPuck}>
              <Ionicons name="car" size={12} color={colors.onPrimary} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      {showUserDot ? <View style={styles.userBadge}><Text style={styles.badgeText}>You are here</Text></View> : null}
      {showRoute ? (
        <>
          <View style={[styles.badge, styles.badgeMint]}><Text style={styles.badgeText}>{pickupLabel}</Text></View>
          <View style={[styles.badge, styles.badgeAmber]}><Text style={[styles.badgeText, styles.badgeTextAmber]}>{destinationLabel}</Text></View>
        </>
      ) : null}
      {driverLabel && driverCoord ? <View style={[styles.badge, styles.badgeMint]}><Text style={styles.badgeText}>{driverLabel}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0E1524',
    overflow: 'hidden',
  },
  userMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primarySurface,
  },
  pickupMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySurface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  destMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPuck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySurface,
    top: 18,
    left: 18,
  },
  badgeMint: {
    backgroundColor: colors.primarySurface,
  },
  badgeAmber: {
    backgroundColor: colors.amberSurface,
    left: 'auto',
    right: 18,
  },
  badgeText: {
    ...type.caption,
    fontSize: 9,
    color: colors.primary,
  },
  badgeTextAmber: {
    color: colors.amber,
  },
  userBadge: {
    position: 'absolute',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySurface,
    top: 18,
    right: 18,
  },
});

