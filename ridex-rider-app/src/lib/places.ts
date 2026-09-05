import { request } from '../api/client';
import { LngLat } from './location';

export type Place = {
  id: string;
  name: string;
  detail: string;
  coord: LngLat;
};

/** What the backend's maps endpoint returns. */
type GeoLocation = {
  latitude: number;
  longitude: number;
  formattedAddress: string | null;
};

/**
 * Place search, through the backend.
 *
 * <p>It used to call Photon directly from the device. That worked, but it put a third party in
 * front of every rider's search box and left the app unable to use the paid geocoder: an API key
 * shipped inside an app is a key anybody can pull out of the APK and bill to us.
 *
 * <p>Going through the backend means the key stays on the server, the provider can be swapped
 * without shipping a new build, and the daily call budget is enforced in one place.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const found = await request<GeoLocation[]>(
    `/api/v1/maps/search?query=${encodeURIComponent(trimmed)}&limit=8`,
    { signal },
  );

  return found.map((place, index) => {
    // "Sector V, Bidhannagar, Kolkata, West Bengal, India" - the first part is the place and the
    // rest is where it is, which is exactly the two lines a result row wants.
    const parts = (place.formattedAddress ?? trimmed).split(',').map((part) => part.trim());

    return {
      // Coordinates, not an id: the backend returns none, and two results never share a point.
      id: `${place.latitude},${place.longitude},${index}`,
      name: parts[0] ?? trimmed,
      detail: parts.slice(1).join(', ') || 'Nearby',
      coord: [place.longitude, place.latitude],
    } satisfies Place;
  });
}
