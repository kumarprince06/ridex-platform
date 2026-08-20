import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  ViewAnnotation,
} from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { FALLBACK_CENTER, LngLat, useCurrentLocation } from '../lib/location';
import { fetchRoute } from '../lib/routes';
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

/**
 * MapLibre against OpenFreeMap's public tiles: no API key, no billing account, no per-load cost.
 *
 * Google's mobile SDK renders free too, but it needs a key restricted per package and a billing
 * account behind it - the moment this project is handed to someone else, that is their card on
 * file. MapLibre keeps the map working out of the box for whoever clones the repo. Swapping back
 * to Google, or to any paid tile host, is a change to this one file per app.
 */
// Full-colour basemap, the way a map is expected to look. OpenFreeMap also serves 'positron'
// (near-greyscale) and 'liberty' if the colour ever needs toning down - one URL, no other change.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

/**
 * Mock trip geometry, offset from wherever the device actually is rather than pinned to a fixed
 * city: a map that opens on Bengaluru while the driver stands in another country reads as broken.
 * Real pickup and dropoff coordinates arrive with the offer (T10).
 */
const PICKUP_OFFSET: [number, number] = [0.004, -0.002];
const DESTINATION_OFFSET: [number, number] = [-0.006, 0.011];

export function MapCanvas({
  showRoute = false,
  driverAt,
  driverLabel,
  showUserDot = false,
  pickupLabel = 'Pickup',
  destinationLabel = 'Destination',
  style,
}: Props) {
  const { coord } = useCurrentLocation();
  const here = coord ?? FALLBACK_CENTER;

  // The driver's pickup is the rider's kerb - a short hop from wherever the driver is now.
  const PICKUP: [number, number] = [here[0] + PICKUP_OFFSET[0], here[1] + PICKUP_OFFSET[1]];
  const DESTINATION: [number, number] = [
    here[0] + DESTINATION_OFFSET[0],
    here[1] + DESTINATION_OFFSET[1],
  ];

  // Road geometry when the router answers, the straight line between the pins until then. The
  // map must draw something the moment it mounts - a blank map while a request is in flight looks
  // like a broken map.
  const [road, setRoad] = useState<LngLat[] | null>(null);

  useEffect(() => {
    if (!showRoute) {
      return;
    }

    const controller = new AbortController();
    fetchRoute(PICKUP, DESTINATION, controller.signal)
      .then((route) => setRoad(route?.coordinates ?? null))
      .catch(() => setRoad(null));

    return () => controller.abort();
  }, [showRoute, PICKUP[0], PICKUP[1], DESTINATION[0], DESTINATION[1]]);

  const line = road ?? [PICKUP, DESTINATION];

  const driver: [number, number] | undefined =
    driverAt === undefined
      ? undefined
      : line[Math.min(line.length - 1, Math.max(0, Math.round((line.length - 1) * driverAt)))];

  return (
    <View style={[styles.map, style]}>
      <Map
        style={StyleSheet.absoluteFillObject}
        mapStyle={STYLE_URL}
        attribution
        logo={false}
        compass={false}
        // North stays up. A rotated or tilted map is disorienting when the sheet, labels and
        // markers are all laid out square to the screen.
        touchRotate={false}
        touchPitch={false}
      >
        <Camera
          // key, so the camera re-mounts and recentres once the device position arrives instead
          // of staying on the fallback centre it opened with.
          key={coord ? 'located' : 'fallback'}
          initialViewState={{
            center: showRoute ? midpoint(PICKUP, DESTINATION) : here,
            zoom: showRoute ? 12.5 : 14.5,
          }}
        />

        {showRoute ? (
          <GeoJSONSource
            id="route"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: line },
            }}
          >
            <Layer
              id="route-line"
              type="line"
              layout={{ 'line-cap': 'round' }}
              paint={{
                'line-color': colors.primary,
                'line-width': 5,
              }}
            />
          </GeoJSONSource>
        ) : null}

        {showUserDot ? (
          coord ? (
            <UserLocation />
          ) : (
            <ViewAnnotation lngLat={here}>
              <View style={styles.userMarker} />
            </ViewAnnotation>
          )
        ) : null}

        {showRoute ? (
          <>
            <ViewAnnotation lngLat={PICKUP}>
              <View style={styles.pickupMarker}>
                <View style={styles.pickupCore} />
              </View>
            </ViewAnnotation>

            <ViewAnnotation lngLat={DESTINATION}>
              <View style={styles.destMarker}>
                <Ionicons name="location" size={14} color="#2B1A05" />
              </View>
            </ViewAnnotation>
          </>
        ) : null}

        {driver ? (
          <ViewAnnotation lngLat={driver}>
            <View style={styles.driverMarker}>
              <Ionicons name="car-sport" size={15} color={colors.onPrimary} />
            </View>
          </ViewAnnotation>
        ) : null}
      </Map>

      {showRoute ? (
        <View style={styles.labels} pointerEvents="none">
          <Label icon="ellipse" text={pickupLabel} tint={colors.primary} />
          <Label icon="location" text={destinationLabel} tint={colors.amber} />
        </View>
      ) : null}

      {driverLabel ? (
        <View style={styles.driverPill} pointerEvents="none">
          <Text style={styles.driverPillLabel}>{driverLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Keeps both ends of the route on screen without asking MapLibre to fit bounds. */
function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function Label({ icon, text, tint }: { icon: 'ellipse' | 'location'; text: string; tint: string }) {
  return (
    <View style={styles.label}>
      <Ionicons name={icon} size={11} color={tint} />
      <Text style={styles.labelText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
  },
  userMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  pickupMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  destMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  labels: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.xxl + spacing.lg,
    gap: spacing.sm,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '80%',
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  labelText: {
    ...type.caption,
    color: colors.text,
  },
  driverPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  driverPillLabel: {
    ...type.caption,
    color: colors.text,
  },
});
