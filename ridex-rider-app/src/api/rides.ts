import { request } from './client';

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
  currency: string;
  quotedFareMinor: number;
  fareLines: FareLine[];
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

/** Every active ride type priced for one route. The client never sends a fare. */
export function estimate(pickup: [number, number], destination: [number, number]) {
  return request<EstimateOption[]>('/api/v1/rides/estimate', {
    method: 'POST',
    body: {
      pickupLat: pickup[0],
      pickupLng: pickup[1],
      destinationLat: destination[0],
      destinationLng: destination[1],
    },
  });
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
