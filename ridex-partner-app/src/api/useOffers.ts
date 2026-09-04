import { useEffect, useRef, useState } from 'react';

import { liveOffers, type Offer } from './driver';

/**
 * Watches for offers while on duty.
 *
 * ponytail: polls every four seconds. The backend pushes over STOMP already, and a socket is both
 * faster and cheaper - but it needs a native client, reconnect handling and auth on the upgrade.
 * The reconnect endpoint this calls exists precisely because a socket cannot be trusted to stay
 * up, so polling it is the same contract at a lower resolution.
 */
const POLL_MS = 4000;

export function useOffers(active: boolean) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      setOffer(null);
      seen.current = null;
      return;
    }

    async function poll() {
      try {
        const offers = await liveOffers();
        const next = offers[0] ?? null;
        // Only surface an offer once: re-raising the same one would reset the countdown the
        // driver is already watching.
        if (next && next.offerId !== seen.current) {
          seen.current = next.offerId;
          setOffer(next);
        } else if (!next) {
          setOffer(null);
        }
      } catch {
        // A dropped poll is not worth a banner mid-traffic; the next one usually succeeds.
      }
    }

    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [active]);

  return { offer, clear: () => setOffer(null) };
}
