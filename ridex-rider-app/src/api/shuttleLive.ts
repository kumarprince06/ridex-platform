import { Client } from '@stomp/stompjs';
import { useEffect, useState } from 'react';

import { loadTokens } from '../auth/tokens';
import { request } from './client';
import { API_BASE_URL } from './config';

export type LiveStop = {
  id: string;
  sequence: number;
  name: string;
  latitude: number;
  longitude: number;
  scheduledAt: string;
  /** Timetable plus the current delay; null once passed. */
  expectedAt: string | null;
  arrivedAt: string | null;
  state: 'PASSED' | 'CURRENT' | 'UPCOMING';
};

export type ShuttleLive = {
  event: string;
  shuttleTripId: string;
  routeName: string;
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED';
  currentStopSequence: number | null;
  delayMinutes: number;
  vehicle: { latitude: number; longitude: number; heading: number | null; at: string } | null;
  stops: LiveStop[];
};

type BookingLive = { trip: ShuttleLive; boardingSequence: number; alightingSequence: number };

const FALLBACK_POLL_MS = 15000;

export function bookingLive(bookingId: string) {
  return request<BookingLive>(`/api/v1/shuttle/bookings/${bookingId}/live`);
}

/**
 * The live state of a booked shuttle: fetched once, then pushed over the socket. While the socket
 * is down (bad network, server restart) it falls back to polling, so the screen never freezes.
 */
export function useShuttleLive(bookingId: string, enabled: boolean) {
  const [live, setLive] = useState<BookingLive | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    const refresh = () =>
      bookingLive(bookingId)
        .then((next) => !cancelled && setLive(next))
        .catch(() => undefined);

    const client = new Client({
      brokerURL: `${API_BASE_URL.replace(/^http/, 'ws')}/ws`,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // React Native's WebSocket needs these for STOMP frames to parse.
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      // A REST call first: it refreshes an expired token and gives us fresh state after a gap.
      beforeConnect: async () => {
        await refresh();
        const token = (await loadTokens())?.accessToken;
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      onConnect: () => {
        setConnected(true);
        void bookingLive(bookingId).then((snapshot) => {
          if (cancelled) return;
          setLive(snapshot);
          client.subscribe(`/topic/shuttle-trips/${snapshot.trip.shuttleTripId}`, (message) => {
            const trip = JSON.parse(message.body) as ShuttleLive;
            setLive((current) => (current ? { ...current, trip } : current));
          });
        });
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();

    return () => {
      cancelled = true;
      void client.deactivate();
    };
  }, [bookingId, enabled]);

  // Only while the socket is down.
  useEffect(() => {
    if (!enabled || connected) {
      return;
    }
    const timer = setInterval(() => {
      void bookingLive(bookingId).then(setLive).catch(() => undefined);
    }, FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [bookingId, enabled, connected]);

  return { live, connected };
}
