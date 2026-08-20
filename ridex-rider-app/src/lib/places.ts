import { LngLat } from './location';

export type Place = {
  id: string;
  name: string;
  detail: string;
  coord: LngLat;
};

/**
 * Photon, Komoot's open geocoder over OpenStreetMap data. No key, no billing, and it is built for
 * search-as-you-type rather than one-shot geocoding.
 *
 * The public instance is fair-use. When this moves to production it goes behind the backend's
 * MapsProvider (T8) - the app should not be talking to a geocoder directly, and self-hosting
 * Photon is a container, not a contract change.
 */
const ENDPOINT = 'https://photon.komoot.io/api/';

/** Results are ranked around the searcher, so "station" means the one down the road. */
export async function searchPlaces(query: string, near: LngLat, signal?: AbortSignal) {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const url =
    `${ENDPOINT}?q=${encodeURIComponent(trimmed)}` +
    `&lat=${near[1]}&lon=${near[0]}&limit=8&lang=en`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Place search failed: ${response.status}`);
  }

  const body = (await response.json()) as {
    features?: {
      geometry: { coordinates: [number, number] };
      properties: Record<string, string | undefined>;
    }[];
  };

  return (body.features ?? []).map((feature, index) => {
    const p = feature.properties;
    // Photon returns whichever of these the OSM object happens to carry, so build the two lines
    // from what is present rather than assuming a fixed shape.
    const detail = [p.street, p.district, p.city, p.state, p.country]
      .filter(Boolean)
      .join(', ');

    return {
      id: `${p.osm_type ?? 'x'}${p.osm_id ?? index}`,
      name: p.name ?? p.street ?? p.city ?? trimmed,
      detail: detail || 'Nearby',
      coord: feature.geometry.coordinates,
    } satisfies Place;
  });
}
