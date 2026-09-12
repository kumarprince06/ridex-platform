import RazorpayCheckout from 'react-native-razorpay';

import { ApiError } from './problem';
import { getProfile } from './profile';
import { confirmPassPayment, type Pass } from './shuttle';
import { CHECKOUT_LOGO } from './shuttleCheckout';

/**
 * Opens Razorpay for a pass and confirms it with the server.
 *
 * <p>The same shape as paying for a seat: the client never decides a payment succeeded, it hands
 * back the gateway's id and the server asks Razorpay. A pass stays PENDING_PAYMENT until it does.
 */
export async function payForPass(pass: Pass): Promise<Pass> {
  if (!pass.checkout) {
    return pass;
  }

  // Prefill saves the rider typing their own email at a payment sheet. A nicety, so a profile
  // that fails to load must not stop them paying.
  const profile = await getProfile().catch(() => null);

  let paymentId: string;
  try {
    const result = await RazorpayCheckout.open({
      key: pass.checkout.gatewayKeyId,
      order_id: pass.checkout.gatewayOrderId,
      amount: pass.checkout.amountMinor,
      currency: pass.checkout.currency,
      name: 'RideX',
      description: `${pass.productName} · ${pass.routeName}`,
      ...(CHECKOUT_LOGO ? { image: CHECKOUT_LOGO } : {}),
      theme: { color: '#2EE7C7' },
      remember_customer: false,
      notes: { passId: pass.id, product: pass.productName },
      prefill: {
        name: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || undefined,
        email: profile?.email ?? undefined,
        contact: profile?.phone ?? undefined,
      },
    });
    paymentId = result.razorpay_payment_id;
  } catch {
    // Dismissed, or the payment failed at the gateway. Either way nothing was captured, and the
    // pass keeps its checkout so it can be paid for from the passes screen later.
    return pass;
  }

  try {
    return await confirmPassPayment(pass.id, paymentId);
  } catch (caught) {
    throw caught instanceof ApiError
      ? caught
      : new Error('Payment taken, but confirming it failed. Check your passes in a moment.');
  }
}
