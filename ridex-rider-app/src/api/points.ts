import { request } from './client';

export type PointReason =
  | 'RIDE_COMPLETED'
  | 'REFERRAL_REWARD'
  | 'REFERRAL_WELCOME'
  | 'REDEEMED_ON_RIDE'
  | 'REDEEMED_ON_SEAT'
  | 'SHUTTLE_CANCELLED'
  | 'ADMIN_ADJUSTMENT';

export type PointEntry = {
  id: string;
  points: number;
  reason: PointReason;
  note: string | null;
  createdAt: string;
};

export type PointsBalance = {
  balance: number;
  referralCode: string;
  referralsPending: number;
  referralsRewarded: number;
  currency: string;
  /** What today's rate would take off a fare. Never a withdrawable amount. */
  redeemableValueMinor: number;
  pointsPerCurrencyUnit: number;
  recent: PointEntry[];
};

export function getPoints() {
  return request<PointsBalance>('/api/v1/points');
}

/** Records who referred this rider. The reward lands when they finish their first ride. */
export function applyReferral(code: string) {
  return request<void>('/api/v1/points/referral', {
    method: 'POST',
    body: { code: code.trim().toUpperCase() },
  });
}

const REASON_LABELS: Record<PointReason, string> = {
  RIDE_COMPLETED: 'Ride completed',
  REFERRAL_REWARD: 'Friend completed a ride',
  REFERRAL_WELCOME: 'Welcome bonus',
  REDEEMED_ON_RIDE: 'Redeemed on a ride',
  REDEEMED_ON_SEAT: 'Redeemed on a shuttle seat',
  SHUTTLE_CANCELLED: 'Credit for a cancelled seat',
  ADMIN_ADJUSTMENT: 'Adjustment',
};

export function reasonLabel(reason: PointReason) {
  return REASON_LABELS[reason] ?? 'Points';
}
