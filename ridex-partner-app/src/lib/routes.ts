import { distance, minutes } from './format';
import { LngLat } from './location';

export type Route = {
  /** Road-following geometry, ready to hand to a MapLibre LineString. */
  coordinates: LngLat[];
  /** Metres. */
  distance: number;
  /** Seconds. */
  duration: number;
};

/**
 * OSRM's public demo server: keyless, free, and it returns real road geometry rather than the
 * straight line between two pins.
 *
 * Demo-server fair use only. In production this call belongs behind the backend's MapsProvider
 * (T8) - the fare is calculated from the route, and a client that chooses its own route chooses
 * its own fare. Self-hosting OSRM is a container; the contract does not change.
 */
const ENDPOINT = 'https://router.project-osrm.org/route/v1/driving';

export async function fetchRoute(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<Route | null> {
  const url =
    `${ENDPOINT}/${from[0]},${from[1]};${to[0]},${to[1]}` +
    '?overview=full&geometries=geojson&alternatives=false&steps=false';

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Route lookup failed: ${response.status}`);
  }

  const body = (await response.json()) as {
    code?: string;
    routes?: { distance: number; duration: number; geometry: { coordinates: LngLat[] } }[];
  };

  const route = body.routes?.[0];
  if (body.code !== 'Ok' || !route) {
    return null;
  }

  return {
    coordinates: route.geometry.coordinates,
    distance: route.distance,
    duration: route.duration,
  };
}

/** "7.8 km · 19 min", the way both apps show a trip. */
export function describeRoute(route: Route) {
  return `${distance(route.distance)} · ${minutes(route.duration)}`;
}

/** Initial compass bearing from a to b, degrees clockwise from north. */
export function bearing(a: LngLat, b: LngLat): number {
  const toRad = Math.PI / 180;
  const [lng1, lat1] = [a[0] * toRad, a[1] * toRad];
  const [lng2, lat2] = [b[0] * toRad, b[1] * toRad];
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  return ((Math.atan2(y, x) / toRad) + 360) % 360;
}
