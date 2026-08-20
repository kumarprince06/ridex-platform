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
 * The device's position, once. Not a live subscription: every screen that draws a map wants a
 * centre to open on, and none of them follow the user around yet. A watch would burn battery for
 * a feature nothing asks for.
 */
export function useCurrentLocation() {
  const [coord, setCoord] = useState<LngLat | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) {
          setDenied(true);
        }
        return;
      }

      // Balanced, not High: opening the map does not need metre accuracy, and High costs a
      // noticeably longer first fix.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!cancelled) {
        setCoord([position.coords.longitude, position.coords.latitude]);
      }
    })().catch(() => {
      // A failed fix is not an error state for the UI - the map falls back to its default centre.
      if (!cancelled) {
        setDenied(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { coord, denied };
}
