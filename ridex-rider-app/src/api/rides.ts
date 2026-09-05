import { request } from './client';
import { LngLat } from '../lib/location';

export type FareLineType =
  | 'BASE' | 'DISTANCE' | 'TIME' | 'WAITING' | 'SURGE'
  | 'DISCOUNT' | 'TOLL' | 'TAX' | 'MINIMUM_FARE_ADJUSTMENT';

export type FareLine = { type: FareLineType; label: string; amountMinor: number };

export type EstimateOption = {
  estimateId: string;
  rideTypeCode: string;
  displayName: string;
  description: string | null;
  seatCapacity: number;
  distanceMeters: number;
  durationSeconds: number;
  currency: string;
  totalMinor: number;
  lines: FareLine[];
  expiresAt: string;
};

export type RideStatus =
  | 'REQUESTED' | 'SEARCHING' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVING'
  | 'DRIVER_AT_PICKUP' | 'TRIP_STARTED' | 'COMPLETED'
  | 'CANCELLED_BY_RIDER' | 'CANCELLED_BY_DRIVER' | 'CANCELLED_BY_SYSTEM' | 'EXPIRED';

export type Ride = {
  id: string;
  status: RideStatus;
  rideTypeCode: string;
  pickupAddress: string | null;
  destinationAddress: string | null;
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  currency: string;
  quotedFareMinor: number;
  fareLines: FareLine[];
  redeemedPoints: number;
  discountMinor: number;
  cancellationFeeMinor: number | null;
  cancellationReason: string | null;
  requestedAt: string;
};

export type CancellationQuote = { currency: string; feeMinor: number; free: boolean };

export type Receipt = {
  currency: string;
  quotedTotalMinor: number;
  chargedTotalMinor: number;
  differenceMinor: number;
  quotedDistanceMeters: number;
  actualDistanceMeters: number;
  quotedLines: FareLine[];
  chargedLines: FareLine[];
};

/**
 * Every active ride type priced for one route. The client never sends a fare.
 *
 * Takes LngLat, the order the map and the search results use. Reading index 0 as the latitude is
 * what priced a Bengaluru trip from a point in the Arabian Sea.
 */
export function estimate(pickup: LngLat, destination: LngLat) {
  return request<EstimateOption[]>('/api/v1/rides/estimate', {
    method: 'POST',
    body: {
      pickupLat: pickup[1],
      pickupLng: pickup[0],
      destinationLat: destination[1],
      destinationLng: destination[0],
    },
  });
}

/** The ride's two ends, in the LngLat order every map in this app takes. */
export function rideRoute(ride: Ride): { pickup: LngLat; destination: LngLat } {
  return {
    pickup: [ride.pickupLng, ride.pickupLat],
    destination: [ride.destinationLng, ride.destinationLat],
  };
}

/** Books the quote the rider chose. Sending the estimate id, not a price, is the whole point. */
export function bookRide(estimateId: string, pickupAddress?: string, destinationAddress?: string) {
  return request<Ride>('/api/v1/rides', {
    method: 'POST',
    body: { estimateId, pickupAddress, destinationAddress },
  });
}

export function getRide(rideId: string) {
  return request<Ride>(`/api/v1/rides/${rideId}`);
}

export function listRides() {
  return request<Ride[]>('/api/v1/rides');
}

/** Asked before showing the confirm dialog, so the fee is never a surprise afterwards. */
export function cancellationQuote(rideId: string) {
  return request<CancellationQuote>(`/api/v1/rides/${rideId}/cancellation-quote`);
}

export function cancelRide(rideId: string, reason?: string) {
  return request<Ride>(`/api/v1/rides/${rideId}/cancel`, { method: 'POST', body: { reason } });
}

export function getReceipt(rideId: string) {
  return request<Receipt>(`/api/v1/rides/${rideId}/receipt`);
}

/** Minor units to a display string. Currency lives on the response, never assumed. */
export function formatMoney(amountMinor: number, currency: string): string {
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  return `${sign}${currency} ${(abs / 100).toFixed(2)}`;
}

const STATUS_LABELS: Record<RideStatus, string> = {
  REQUESTED: 'Requested',
  SEARCHING: 'Finding a driver',
  DRIVER_ASSIGNED: 'Driver assigned',
  DRIVER_ARRIVING: 'Driver on the way',
  DRIVER_AT_PICKUP: 'Driver waiting',
  TRIP_STARTED: 'On the trip',
  COMPLETED: 'Completed',
  CANCELLED_BY_RIDER: 'Cancelled',
  CANCELLED_BY_DRIVER: 'Cancelled by driver',
  CANCELLED_BY_SYSTEM: 'Cancelled',
  EXPIRED: 'No driver found',
};

/** One place decides what a status reads as, so two screens cannot word it differently. */
export function rideStatusLabel(status: RideStatus): string {
  return STATUS_LABELS[status];
}

export function isCancelled(status: RideStatus): boolean {
  return status.startsWith('CANCELLED') || status === 'EXPIRED';
}

export function isLive(status: RideStatus): boolean {
  return !isCancelled(status) && status !== 'COMPLETED';
}

/**
 * Today and yesterday get named, because "Today, 2:30 PM" is what the rider is actually scanning
 * for in a list. Anything older is just a date.
 */
export function formatWhen(iso: string): string {
  const at = new Date(iso);
  const time = at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const daysAgo = Math.floor((midnight.getTime() - at.getTime()) / 86_400_000) + 1;

  if (daysAgo <= 0) return `Today, ${time}`;
  if (daysAgo === 1) return `Yesterday, ${time}`;
  return `${at.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}

/** One rating per ride, and only once it completed. The server rejects a second attempt. */
export function rateRide(rideId: string, stars: number, comment?: string) {
  return request<void>(`/api/v1/rides/${rideId}/rating`, {
    method: 'POST',
    body: { stars, comment },
  });
}
