type LngLat = [number, number];

/** The same public OSRM service the rider app draws its road lines with. */
const ENDPOINT = 'https://router.project-osrm.org/route/v1/driving';

/** The driven path through every point in order, or null when routing is unavailable. */
export async function roadThrough(points: LngLat[], signal?: AbortSignal): Promise<LngLat[] | null> {
  if (points.length < 2) {
    return null;
  }
  const path = points.map(([lng, lat]) => `${lng},${lat}`).join(';');
  try {
    const response = await fetch(`${ENDPOINT}/${path}?overview=full&geometries=geojson&steps=false`, { signal });
    if (!response.ok) return null;
    const body = (await response.json()) as { code?: string; routes?: { geometry: { coordinates: LngLat[] } }[] };
    return body.code === 'Ok' ? (body.routes?.[0]?.geometry.coordinates ?? null) : null;
  } catch {
    return null;
  }
}
