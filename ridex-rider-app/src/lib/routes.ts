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
  const km = (route.distance / 1000).toFixed(1);
  const minutes = Math.max(1, Math.round(route.duration / 60));
  return `${km} km · ${minutes} min`;
}
