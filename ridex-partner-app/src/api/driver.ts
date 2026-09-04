import { request } from './client';

export type OnboardingStatus =
  | 'REGISTERED' | 'PROFILE_SUBMITTED' | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type Onboarding = {
  driverId: string;
  email: string;
  status: OnboardingStatus;
  eligibleToDrive: boolean;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

export type Offer = {
  offerId: string;
  rideId: string;
  pickupAddress: string | null;
  destinationAddress: string | null;
  pickupLat: number;
  pickupLng: number;
  tripDistanceMeters: number;
  distanceToPickupMeters: number | null;
  currency: string;
  quotedFareMinor: number;
  // Server-issued. The countdown is rendered from this, never computed on the phone, or a paused
  // app could accept an offer that expired minutes ago.
  expiresAt: string;
};

export type Trip = {
  tripId: string;
  rideId: string;
  status: string;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  waitingSeconds: number;
  currency: string;
  finalFareMinor: number | null;
};

export function getOnboarding() {
  return request<Onboarding>('/api/v1/driver/onboarding');
}

export function submitForReview() {
  return request<Onboarding>('/api/v1/driver/onboarding/submit', { method: 'POST' });
}

/** Going on duty needs a position: dispatch cannot offer to a driver it cannot place. */
export function setDuty(onDuty: boolean, latitude?: number, longitude?: number) {
  return request<void>('/api/v1/driver/duty', {
    method: 'PUT',
    body: { onDuty, latitude, longitude },
  });
}

export function reportLocation(latitude: number, longitude: number) {
  return request<void>('/api/v1/driver/location', { method: 'POST', body: { latitude, longitude } });
}

/** What the app asks for on reconnect: a dropped socket must not lose a ride. */
export function liveOffers() {
  return request<Offer[]>('/api/v1/driver/offers');
}

export function acceptOffer(offerId: string) {
  return request<Offer>(`/api/v1/driver/offers/${offerId}/accept`, { method: 'POST' });
}

export function rejectOffer(offerId: string) {
  return request<void>(`/api/v1/driver/offers/${offerId}/reject`, { method: 'POST' });
}

export function arriveAtPickup(tripId: string) {
  return request<Trip>(`/api/v1/trips/${tripId}/arrive`, { method: 'POST' });
}

/** The same call whether the code was scanned from the rider's QR or typed. */
export function startTrip(tripId: string, pickupCode: string) {
  return request<Trip>(`/api/v1/trips/${tripId}/start`, { method: 'POST', body: { pickupCode } });
}

export function completeTrip(tripId: string, distanceMeters: number, durationSeconds: number) {
  return request<Trip>(`/api/v1/trips/${tripId}/complete`, {
    method: 'POST',
    body: { distanceMeters, durationSeconds },
  });
}

export function formatMoney(amountMinor: number, currency: string): string {
  return `${currency} ${(amountMinor / 100).toFixed(2)}`;
}
