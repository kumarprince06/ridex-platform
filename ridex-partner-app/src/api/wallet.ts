import RazorpayCheckout from 'react-native-razorpay';

import { request } from './client';
import { ApiError } from './problem';
import { getProfile } from './profile';

/** The driver ledger read as a wallet. Negative is platform fees on cash the driver kept. */
export type Wallet = {
  currency: string;
  balanceMinor: number;
  limitMinor: number;
  /** What a top-up collects: everything owed, so the wallet lands back at zero. */
  dueMinor: number;
  /** Below the limit: no offers, and going online is refused until it is paid. */
  blocked: boolean;
};

type TopUpCheckout = { topUpId: string; orderId: string; keyId: string; amountMinor: number; currency: string };

export function getWallet() {
  return request<Wallet>('/api/v1/driver/wallet');
}

/**
 * Opens Razorpay for everything owed and confirms it with the server - the same flow the rider app
 * pays a fare with. Resolves to the new wallet, or null when the driver closed checkout.
 */
export async function payOffWallet(): Promise<Wallet | null> {
  // One key per tap: a retried or doubled request gets the same checkout, never a second order.
  const idempotencyKey = `topup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const checkout = await request<TopUpCheckout>('/api/v1/driver/wallet/top-ups', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
  });

  // Prefill spares the driver typing their own number. A nicety: a profile that fails to load
  // must not stop them paying.
  const profile = await getProfile().catch(() => null);

  let paymentId: string;
  try {
    const result = await RazorpayCheckout.open({
      key: checkout.keyId,
      order_id: checkout.orderId,
      amount: checkout.amountMinor,
      currency: checkout.currency,
      name: 'RideX Partner',
      description: 'Wallet top-up',
      theme: { color: '#2EE7C7' },
      remember_customer: false,
      notes: { topUpId: checkout.topUpId },
      prefill: {
        name: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || undefined,
        email: profile?.email ?? undefined,
        contact: profile?.phone ?? undefined,
      },
    });
    paymentId = result.razorpay_payment_id;
  } catch {
    // Dismissed or declined: nothing was captured, and the wallet still says what is owed.
    return null;
  }

  try {
    return await request<Wallet>(`/api/v1/driver/wallet/top-ups/${checkout.topUpId}/confirm`, {
      method: 'POST',
      body: { gatewayPaymentId: paymentId },
    });
  } catch (caught) {
    throw caught instanceof ApiError
      ? caught
      : new Error('Payment taken, but confirming it failed. Check your wallet in a moment.');
  }
}
