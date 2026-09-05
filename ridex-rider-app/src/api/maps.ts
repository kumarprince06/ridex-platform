import { request } from './client';
import { LngLat } from '../lib/location';

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  /** The provider's own wording, e.g. "7.8 km". */
  distanceText: string;
  durationText: string;
  /** With current traffic. Null when the provider has no traffic model. */
  durationInTrafficSeconds: number | null;
};

export type Traffic = { label: 'Light' | 'Moderate' | 'Heavy'; tone: string };

/**
 * How much longer the road is taking than it would empty.
 *
 * A ratio, not an absolute delay: five minutes lost on a ten-minute trip is a jam, and the same
 * five on an hour's drive is nothing. Null when the provider does not report traffic, so the
 * caller can leave the tile out rather than print a comforting "Light" it cannot stand behind.
 */
export function trafficOf(route: RouteEstimate): Traffic | null {
  if (!route.durationInTrafficSeconds || route.durationSeconds <= 0) {
    return null;
  }

  const ratio = route.durationInTrafficSeconds / route.durationSeconds;
  if (ratio < 1.15) {
    return { label: 'Light', tone: '#5FD68A' };
  }
  return ratio < 1.4 ? { label: 'Moderate', tone: '#E0B252' } : { label: 'Heavy', tone: '#FF5C7A' };
}

/**
 * How far and how long, from the backend's routing provider.
 *
 * The same provider chain that prices the fare, so the distance a rider is shown before booking
 * is the distance the quote was built from. Routing from the device against a different service
 * would put two different numbers in front of the same trip.
 */
export function routeEstimate(pickup: LngLat, destination: LngLat, signal?: AbortSignal) {
  const query = new URLSearchParams({
    pickupLat: String(pickup[1]),
    pickupLng: String(pickup[0]),
    destinationLat: String(destination[1]),
    destinationLng: String(destination[0]),
  });

  return request<RouteEstimate>(`/api/v1/maps/route?${query.toString()}`, { signal });
}
