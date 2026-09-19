import { Camera, GeoJSONSource, Images, Layer, Map, ViewAnnotation } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import type { LiveStop, ShuttleLive } from '../api/shuttleLive';
import { clockTime } from '../lib/format';
import type { LngLat } from '../lib/location';
import { bearing, fetchRouteThrough } from '../lib/routes';
import { colors, radius, spacing, type } from '../theme';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';
const SPRITES = {
  minibus: require('../../assets/vehicles/minibus.png'),
  bus: require('../../assets/vehicles/bus.png'),
};

type Props = {
  stops: LiveStop[];
  vehicle: ShuttleLive['vehicle'];
  boardingSequence: number;
  alightingSequence: number;
  /** Picks the sprite: up to 26 seats is a minibus. */
  seatCapacity?: number | null;
  style?: ViewStyle;
};

/**
 * The whole shuttle route on a map: the road through every stop, the stops as dots (tap one for
 * its name), and the shuttle itself turned the way it is heading.
 */
export function ShuttleRouteMap({ stops, vehicle, boardingSequence, alightingSequence, seatCapacity, style }: Props) {
  const points = useMemo<LngLat[]>(() => stops.map((stop) => [stop.longitude, stop.latitude]), [stops]);
  const pointsKey = points.flat().join(',');
  const [road, setRoad] = useState<LngLat[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchRouteThrough(points, controller.signal).then(setRoad).catch(() => setRoad(null));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);

  const stopFeatures = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: stops.map((stop) => ({
        type: 'Feature' as const,
        id: stop.id,
        properties: {
          id: stop.id,
          state: stop.state,
          mine: stop.sequence === boardingSequence || stop.sequence === alightingSequence,
        },
        geometry: { type: 'Point' as const, coordinates: [stop.longitude, stop.latitude] },
      })),
    }),
    [stops, boardingSequence, alightingSequence],
  );

  const next = stops.find((stop) => stop.state === 'UPCOMING');
  const vehicleAt: LngLat | null = vehicle ? [vehicle.longitude, vehicle.latitude] : null;
  // The phone's heading when it's moving, otherwise the way to the next stop.
  const heading = vehicle?.heading ?? (vehicleAt && next ? bearing(vehicleAt, [next.longitude, next.latitude]) : 0);
  const selectedStop = stops.find((stop) => stop.id === selected);

  if (points.length === 0) {
    return null;
  }

  return (
    <View style={[styles.map, style]}>
      <Map
        style={StyleSheet.absoluteFillObject}
        mapStyle={STYLE_URL}
        logo={false}
        compass={false}
        attribution={false}
        touchRotate={false}
        touchPitch={false}
        onPress={() => setSelected(null)}
      >
        <Camera
          key={pointsKey}
          initialViewState={{ bounds: boundsOf(points), padding: { top: 40, right: 32, bottom: 40, left: 32 } }}
        />

        <GeoJSONSource
          id="shuttle-route"
          data={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: road ?? points } }}
        >
          <Layer
            id="shuttle-route-casing"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': '#0B1220', 'line-width': 7, 'line-opacity': 0.5 }}
          />
          <Layer
            id="shuttle-route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': colors.primary, 'line-width': 4 }}
          />
        </GeoJSONSource>

        <GeoJSONSource
          id="shuttle-stops"
          data={stopFeatures}
          onPress={(event) => {
            const id = event.nativeEvent.features[0]?.properties?.id;
            if (typeof id === 'string') setSelected(id);
          }}
        >
          <Layer
            id="shuttle-stop-dots"
            type="circle"
            paint={{
              'circle-radius': ['case', ['get', 'mine'], 8, 5.5],
              'circle-color': [
                'match',
                ['get', 'state'],
                'PASSED', colors.primaryMuted,
                'CURRENT', colors.primary,
                '#FFFFFF',
              ],
              'circle-stroke-width': ['case', ['get', 'mine'], 3, 2],
              'circle-stroke-color': ['case', ['get', 'mine'], colors.amber, '#0B1220'],
            }}
          />
        </GeoJSONSource>

        {vehicleAt ? (
          <>
            <Images images={SPRITES} />
            <GeoJSONSource
              id="shuttle-vehicle"
              data={{ type: 'Feature', properties: { heading }, geometry: { type: 'Point', coordinates: vehicleAt } }}
            >
              <Layer
                id="shuttle-vehicle-icon"
                type="symbol"
                layout={{
                  'icon-image': seatCapacity != null && seatCapacity > 26 ? 'bus' : 'minibus',
                  'icon-size': 0.2,
                  'icon-rotate': ['get', 'heading'],
                  'icon-rotation-alignment': 'map',
                  'icon-allow-overlap': true,
                  'icon-ignore-placement': true,
                }}
              />
            </GeoJSONSource>
          </>
        ) : null}

        {selectedStop ? (
          <ViewAnnotation
            key={selectedStop.id}
            lngLat={[selectedStop.longitude, selectedStop.latitude]}
            anchor="bottom"
            offset={[0, -10]}
          >
            <View style={styles.callout}>
              <Text style={styles.calloutName} numberOfLines={1}>{selectedStop.name}</Text>
              <Text style={styles.calloutTime}>{stopTime(selectedStop)}</Text>
              <View style={styles.calloutArrow} />
            </View>
          </ViewAnnotation>
        ) : null}
      </Map>
    </View>
  );
}

function stopTime(stop: LiveStop): string {
  if (stop.arrivedAt) return `Reached ${clockTime(stop.arrivedAt)}`;
  if (stop.expectedAt) return `Expected ${clockTime(stop.expectedAt)}`;
  return `Scheduled ${clockTime(stop.scheduledAt)}`;
}

function boundsOf(points: LngLat[]): [number, number, number, number] {
  const lngs = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

const styles = StyleSheet.create({
  map: {
    height: 260,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  callout: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    maxWidth: 220,
  },
  calloutName: {
    ...type.button,
    fontSize: 13,
    color: colors.text,
  },
  calloutTime: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  // A small triangle under the bubble, pointing at the stop.
  calloutArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.bg,
  },
});
