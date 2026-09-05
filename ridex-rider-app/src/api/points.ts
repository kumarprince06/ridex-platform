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
  /** The most that may be spent on one ride or one seat, whatever the balance. */
  maxRedeemPerJourney: number;
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

/**
 * What can actually go towards one journey: the balance, capped by the per-journey limit.
 *
 * <p>Offering the whole balance and having the server quietly take less is how a rider ends up
 * believing points vanished. The fare caps it further, server-side, which this cannot know.
 */
export function spendableNow(points: PointsBalance): { points: number; valueMinor: number } {
  const spendable = Math.min(points.balance, points.maxRedeemPerJourney);
  const whole = Math.floor(spendable / points.pointsPerCurrencyUnit) * points.pointsPerCurrencyUnit;
  return { points: whole, valueMinor: (whole / points.pointsPerCurrencyUnit) * 100 };
}
