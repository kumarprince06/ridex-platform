import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

/** [longitude, latitude] - MapLibre's order, the reverse of the one Google's APIs use. */
export type LngLat = [number, number];

/**
 * Where the map points when the device has not answered yet, or refused. Bengaluru, because the
 * mock trips are written around it - a map that opens on null island looks broken.
 */
export const FALLBACK_CENTER: LngLat = [77.5946, 12.9716];

/**
 * Last known position, shared across screens for the life of the process.
 *
 * Without this every screen that mounts a map asks the OS again and spends its first seconds on
 * the fallback centre before jumping - which reads as the map "finding" you late, over and over.
 * One cached fix means the second map opens where you are, immediately.
 */
let cached: LngLat | null = null;

/**
 * When the cached fix was taken. A fix from two minutes ago is still where you are, and asking
 * the GPS again on every screen that mounts a map is what makes opening one feel slow.
 */
let cachedAt = 0;
const FRESH_MS = 2 * 60 * 1000;

/**
 * Warms the cache at launch, so the first map already has somewhere to point.
 *
 * Two reads: the OS's last known fix comes back instantly and is usually metres out at worst,
 * then a fresh fix corrects it. Waiting only for the fresh one is what makes the map jump.
 */
export async function primeLocation() {
  if (cached && Date.now() - cachedAt < FRESH_MS) {
    return;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
    if (last && !cached) {
      cached = [last.coords.longitude, last.coords.latitude];
    }

    // Balanced, not High: opening a map does not need metre accuracy, and High costs a
    // noticeably longer first fix.
    const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    cached = [fresh.coords.longitude, fresh.coords.latitude];
    cachedAt = Date.now();
  } catch {
    // A failed fix is not an error state for the UI - maps fall back to their default centre.
  }
}

/**
 * The device's position. Returns the cached fix synchronously on every screen after the first,
 * and refreshes in the background.
 */
export function useCurrentLocation() {
  const [coord, setCoord] = useState<LngLat | null>(cached);

  useEffect(() => {
    let cancelled = false;

    primeLocation().then(() => {
      if (!cancelled && cached) {
        setCoord(cached);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { coord, denied: coord === null };
}
