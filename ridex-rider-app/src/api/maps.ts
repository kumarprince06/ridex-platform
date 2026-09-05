import { useEffect, useState } from 'react';

import { request } from './client';
import { LngLat, useCurrentLocation } from '../lib/location';

/**
 * The address the device is standing at.
 *
 * Cached per rounded position for the life of the process: every screen in the booking flow shows
 * the pickup, and each one asking the geocoder again would spend the daily budget on the same
 * answer. Rounded to five decimals - about a metre, which no address is narrower than.
 */
let cachedAddress: { key: string; address: string } | null = null;

export function useCurrentAddress(): string | null {
  const { coord } = useCurrentLocation();
  const [address, setAddress] = useState<string | null>(
    coord && cachedAddress?.key === keyOf(coord) ? cachedAddress.address : null,
  );

  useEffect(() => {
    if (!coord) {
      return;
    }
    const key = keyOf(coord);
    if (cachedAddress?.key === key) {
      setAddress(cachedAddress.address);
      return;
    }

    let cancelled = false;
    reverseGeocode(coord)
      .then((place) => {
        if (cancelled || !place.formattedAddress) {
          return;
        }
        cachedAddress = { key, address: place.formattedAddress };
        setAddress(place.formattedAddress);
      })
      // The caller falls back to "Current location", which is still true, just less useful.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [coord?.[0], coord?.[1]]);

  return address;
}

function keyOf(coord: LngLat) {
  return `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;
}

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

export type GeoLocation = {
  latitude: number;
  longitude: number;
  formattedAddress: string | null;
};

/** The address at a pinned point, so a rider who cannot name where they are can still be found. */
export function reverseGeocode(point: LngLat, signal?: AbortSignal) {
  return request<GeoLocation>(
    `/api/v1/maps/reverse?lat=${point[1]}&lng=${point[0]}`,
    { signal },
  );
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
