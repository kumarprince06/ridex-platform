import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

/** Metres. Earth's mean radius - good to a fraction of a percent at city scale. */
const EARTH_RADIUS_M = 6371000;

/**
 * A fix worse than this is jitter, not a move. Urban GPS routinely reports 50-100 m accuracy
 * between buildings, and counting those hops adds kilometres to a stationary car.
 */
const MAX_ACCURACY_M = 50;

/** Below this a step is noise. Above it, at a 20 m fix interval, it is the car moving. */
const MIN_STEP_M = 15;

type Coords = { latitude: number; longitude: number };

/** Haversine. Treating degrees as a flat grid is off by kilometres over a trip. */
function metresBetween(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Accumulates the distance actually driven, from the device's own fixes.
 *
 * The fare is calculated from this number, so it is the one thing on the trip screen that is not
 * decoration. It is still only the driver's phone's word: the server bounds it against the quoted
 * route before it prices anything.
 *
 * ponytail: straight lines between fixes, not map-matched routing. A 20 m sampling interval means
 * the chord and the road differ by centimetres per step; map matching is worth it only if the
 * bound the server applies starts catching honest trips.
 */
export function trackTripDistance(tripId?: string) {
  let metres = 0;
  // Kept per trip so an app relaunch mid-trip continues the odometer instead of restarting at 0.
  const key = tripId ? `ridex.tripDistance.${tripId}` : null;
  if (key) {
    SecureStore.getItemAsync(key)
      .then((stored) => {
        metres += Number(stored) || 0;
      })
      .catch(() => undefined);
  }
  let last: Coords | null = null;
  let subscription: Location.LocationSubscription | null = null;
  let stopped = false;

  Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 20 },
    (fix) => {
      if (fix.coords.accuracy != null && fix.coords.accuracy > MAX_ACCURACY_M) {
        return;
      }
      if (!last) {
        last = fix.coords;
        return;
      }
      const step = metresBetween(last, fix.coords);
      // Below the floor the old anchor is kept, so standing at a light does not drift upwards.
      if (step >= MIN_STEP_M) {
        metres += step;
        last = fix.coords;
        if (key) {
          void SecureStore.setItemAsync(key, String(metres)).catch(() => undefined);
        }
      }
    },
  )
    .then((sub) => {
      if (stopped) {
        sub.remove();
      } else {
        subscription = sub;
      }
    })
    // Permission refused or no fix: the server falls back to the quoted route rather than
    // pricing a trip at zero.
    .catch(() => undefined);

  return {
    metres: () => Math.round(metres),
    stop: () => {
      stopped = true;
      subscription?.remove();
      subscription = null;
    },
    /** Once the trip is completed, so the stored total does not outlive it. */
    forget: () => (key ? SecureStore.deleteItemAsync(key).catch(() => undefined) : Promise.resolve()),
  };
}
