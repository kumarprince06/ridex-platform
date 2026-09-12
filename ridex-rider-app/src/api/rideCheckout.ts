import RazorpayCheckout from 'react-native-razorpay';

import { ApiError } from './problem';
import { getProfile } from './profile';
import { confirmRidePayment, type RidePayment } from './rides';
import { CHECKOUT_LOGO } from './shuttleCheckout';

/**
 * Opens Razorpay for a finished trip and confirms it with the server.
 *
 * <p>After the ride, not before: a taxi fare is priced from the distance actually driven, so there
 * is nothing to charge until the driver has swiped to complete. A seat and a pass are the other
 * way round - both are published in advance and paid for up front.
 */
export async function payForRide(rideId: string, payment: RidePayment): Promise<RidePayment> {
  if (payment.settled || !payment.gatewayOrderId || !payment.gatewayKeyId) {
    return payment;
  }

  // Prefill saves the rider typing their own email at a payment sheet. A nicety, so a profile that
  // fails to load must not stop them paying.
  const profile = await getProfile().catch(() => null);

  let paymentId: string;
  try {
    const result = await RazorpayCheckout.open({
      key: payment.gatewayKeyId,
      order_id: payment.gatewayOrderId,
      amount: payment.amountMinor,
      currency: payment.currency,
      name: 'RideX',
      description: 'Your trip',
      ...(CHECKOUT_LOGO ? { image: CHECKOUT_LOGO } : {}),
      theme: { color: '#2EE7C7' },
      remember_customer: false,
      notes: { rideId, paymentId: payment.paymentId },
      prefill: {
        name: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || undefined,
        email: profile?.email ?? undefined,
        contact: profile?.phone ?? undefined,
      },
    });
    paymentId = result.razorpay_payment_id;
  } catch {
    // Dismissed, or declined at the gateway. Either way nothing was captured and the fare is still
    // owed - which the next booking will say, because an unpaid fare blocks one.
    return payment;
  }

  try {
    return await confirmRidePayment(rideId, paymentId);
  } catch (caught) {
    throw caught instanceof ApiError
      ? caught
      : new Error('Payment taken, but confirming it failed. Check your rides in a moment.');
  }
}
