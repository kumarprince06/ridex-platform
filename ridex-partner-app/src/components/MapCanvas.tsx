import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map,
  ViewAnnotation,
} from '@maplibre/maplibre-react-native';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { useQuery } from '../api/useQuery';
import { listVehicles, type VehicleType } from '../api/vehicles';
import { FALLBACK_CENTER, LngLat, useCurrentLocation, useLivePosition } from '../lib/location';
import { bearing, fetchRoute, type Route } from '../lib/routes';
import { colors } from '../theme';

type Props = {
  /** The rider's kerb. Drawn when given. */
  pickup?: LngLat;
  /** Where the trip ends. Drawn when given. */
  destination?: LngLat;
  /**
   * Route from the driver's own position to the next stop (pickup, else destination) rather than
   * pickup to destination. On for the screens where the driver is driving, off for the offer.
   */
  routeFromMe?: boolean;
  /** The driver's own vehicle at their live position, never a point interpolated along the line. */
  showUserDot?: boolean;
  /** Road distance and time once the router answers, for a real ETA instead of a made-up one. */
  onRoute?: (route: Route) => void;
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

// Top-down sprites, nose up, drawn by the map itself so they rotate with the road like a nav app.
const SPRITES = {
  bike: require('../../assets/vehicles/bike.png'),
  auto: require('../../assets/vehicles/auto.png'),
  car: require('../../assets/vehicles/car.png'),
  minibus: require('../../assets/vehicles/minibus.png'),
  bus: require('../../assets/vehicles/bus.png'),
};

const SPRITE_FOR: Record<VehicleType, keyof typeof SPRITES> = {
  BICYCLE: 'bike', SCOOTER: 'bike', MOTORCYCLE: 'bike',
  E_RICKSHAW: 'auto', AUTO_RICKSHAW: 'auto',
  HATCHBACK: 'car', SEDAN: 'car', MPV: 'car', SUV: 'car', VAN: 'car', PICKUP: 'car',
  MINIBUS: 'minibus', BUS: 'bus',
};

export function MapCanvas({
  pickup,
  destination,
  routeFromMe = false,
  showUserDot = false,
  onRoute,
  style,
}: Props) {
  // One fix for routing (re-routing on every step would flicker), a live one for the marker.
  const { coord } = useCurrentLocation();
  const here = coord ?? FALLBACK_CENTER;
  const showMe = showUserDot || routeFromMe;
  const live = useLivePosition(showMe);
  const me = live.position ?? here;
  const { data: vehicles } = useQuery(listVehicles);
  const vehicle = vehicles?.find((candidate) => candidate.status === 'ACTIVE') ?? vehicles?.[0];

  // The map is light, so the app-wide light status bar vanishes on it. Rendered only while this
  // screen is focused: expo-status-bar stacks instances, so the dark screens underneath win back.
  const focused = useIsFocused();

  const from = routeFromMe ? (coord ?? undefined) : pickup;
  const to = routeFromMe ? (pickup ?? destination) : destination;

  // Road geometry when the router answers, the straight line between the ends until then. The
  // map must draw something the moment it mounts - a blank map while a request is in flight looks
  // like a broken map.
  const [road, setRoad] = useState<LngLat[] | null>(null);
  const onRouteRef = useRef(onRoute);
  onRouteRef.current = onRoute;

  useEffect(() => {
    if (!from || !to) {
      return;
    }
    const controller = new AbortController();
    fetchRoute(from, to, controller.signal)
      .then((route) => {
        setRoad(route?.coordinates ?? null);
        if (route) {
          onRouteRef.current?.(route);
        }
      })
      .catch(() => setRoad(null));

    return () => controller.abort();
  }, [from?.[0], from?.[1], to?.[0], to?.[1]]);

  const line = from && to ? (road ?? [from, to]) : null;
  const sprite = SPRITE_FOR[vehicle?.vehicleType ?? 'SEDAN'];
  const heading = headingAlong(line, me) ?? live.heading ?? 0;
  // Frame the whole road, not just its ends: a route that loops past the pickup runs off-screen.
  const framed = [...(line ?? []), pickup, destination, showMe ? me : undefined].filter(
    (point): point is LngLat => Boolean(point),
  );

  return (
    <View style={[styles.map, style]}>
      {focused ? <StatusBar style="dark" /> : null}
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
          // key, so the camera re-frames once the device position or the trip points arrive
          // instead of staying on the fallback centre it opened with.
          key={`${coord ? 'located' : 'fallback'}:${road ? road.length : 0}:${[pickup, destination].flat().join(',')}`}
          initialViewState={
            framed.length > 1
              ? { bounds: boundsOf(framed), padding: FRAME_PADDING }
              : { center: framed[0] ?? here, zoom: 14.5, padding: FRAME_PADDING }
          }
        />

        {line ? (
          <GeoJSONSource
            id="route"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: line },
            }}
          >
            <Layer
              id="route-casing"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#0B1220', 'line-width': 8, 'line-opacity': 0.6 }}
            />
            <Layer
              id="route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': colors.primary,
                'line-width': 5,
              }}
            />
          </GeoJSONSource>
        ) : null}

        {showMe ? (
          <>
            <Images images={SPRITES} />
            <GeoJSONSource
              id="me"
              data={{ type: 'Feature', properties: { heading }, geometry: { type: 'Point', coordinates: me } }}
            >
              <Layer
                id="me-vehicle"
                type="symbol"
                layout={{
                  'icon-image': sprite,
                  'icon-size': 0.22,
                  'icon-rotate': ['get', 'heading'],
                  // Turns with the map, so the nose stays on the road rather than on the screen top.
                  'icon-rotation-alignment': 'map',
                  'icon-allow-overlap': true,
                  'icon-ignore-placement': true,
                }}
              />
            </GeoJSONSource>
          </>
        ) : null}

        {pickup ? (
          <ViewAnnotation lngLat={pickup}>
            <View style={styles.pickupMarker}>
              <View style={styles.pickupCore} />
            </View>
          </ViewAnnotation>
        ) : null}

        {destination ? (
          <ViewAnnotation lngLat={destination}>
            <View style={styles.destMarker}>
              <Ionicons name="location" size={14} color="#2B1A05" />
            </View>
          </ViewAnnotation>
        ) : null}
      </Map>

    </View>
  );
}

// Room for the address pills on top and the bottom sheet every map screen carries.
const FRAME_PADDING = { top: 220, right: 48, bottom: 420, left: 48 };

// ~25 m in degrees at Indian latitudes; direction only, so the approximation is plenty.
const LOOK_AHEAD_DEG = 0.00025;

/** Which way the road goes from where the driver is: the bearing to the next distinct route point. */
function headingAlong(line: LngLat[] | null, at: LngLat): number | null {
  if (!line || line.length < 2) {
    return null;
  }
  let nearest = 0;
  let best = Infinity;
  line.forEach((point, index) => {
    const d = (point[0] - at[0]) ** 2 + (point[1] - at[1]) ** 2;
    if (d < best) {
      best = d;
      nearest = index;
    }
  });
  // Look ~25 m ahead: the first few metres of a route are often a kerb-side stub that points the
  // wrong way for the road the driver is actually about to take.
  const origin = line[nearest];
  const ahead = line.slice(nearest + 1);
  const next = ahead.find((point) => (point[0] - origin[0]) ** 2 + (point[1] - origin[1]) ** 2 > LOOK_AHEAD_DEG ** 2)
    ?? ahead[ahead.length - 1];
  return next ? bearing(origin, next) : null;
}

function boundsOf(points: LngLat[]): [number, number, number, number] {
  const lngs = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}


const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
  },
  // White-rimmed and solid, so both stops read against any tile colour.
  pickupMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  destMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.amber,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
