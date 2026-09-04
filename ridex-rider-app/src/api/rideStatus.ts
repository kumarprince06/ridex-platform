import { useEffect, useRef, useState } from 'react';

import { getRide, type Ride } from './rides';

/**
 * Follows a ride until it reaches a terminal state.
 *
 * ponytail: polls every three seconds. The backend already pushes over STOMP, and a socket would
 * be both faster and cheaper - but it needs a native STOMP client, reconnect handling and auth on
 * the upgrade. Polling is honest for a two-minute search and nothing above this changes when the
 * socket lands.
 */
const POLL_MS = 3000;

const TERMINAL: Ride['status'][] = [
  'COMPLETED', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_SYSTEM', 'EXPIRED',
];

export function useRideStatus(rideId: string | null) {
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Held in a ref so the poll can stop itself without re-running the effect on every tick.
  const stopped = useRef(false);

  useEffect(() => {
    if (!rideId) {
      return;
    }
    stopped.current = false;

    async function poll() {
      if (stopped.current) {
        return;
      }
      try {
        const next = await getRide(rideId!);
        setRide(next);
        if (TERMINAL.includes(next.status)) {
          stopped.current = true;
        }
      } catch {
        // A dropped poll is not worth interrupting a ride over; the next one usually succeeds.
        setError('Lost contact with RideX. Retrying...');
      }
    }

    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped.current = true;
      clearInterval(timer);
    };
  }, [rideId]);

  return { ride, error };
}
