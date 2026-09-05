import { request } from './client';
import { LngLat } from '../lib/location';

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  /** The provider's own wording, e.g. "7.8 km". */
  distanceText: string;
  durationText: string;
};

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
