import RazorpayCheckout from 'react-native-razorpay';

import { ApiError } from './problem';
import { getProfile } from './profile';
import { confirmShuttlePayment, type ShuttleBooking } from './shuttle';

/**
 * The logo shown at the top of checkout. Razorpay fetches it, so it has to be a public URL - a
 * bundled asset cannot be handed to it. Left empty until one is hosted, in which case checkout
 * falls back to the logo set on the Razorpay dashboard, which is where the branding belongs.
 */
const CHECKOUT_LOGO = process.env.EXPO_PUBLIC_CHECKOUT_LOGO_URL ?? '';

/**
 * Opens Razorpay for a held seat and confirms it with the server.
 *
 * <p>The server is what decides the seat is paid for: this hands it the gateway's payment id and
 * the server asks Razorpay. A client is the one party with a reason to claim a payment succeeded.
 *
 * <p>A cancelled checkout is not an error worth throwing - the seat stays held for its ten minutes
 * and the ticket says so - so the unpaid booking comes back as it is.
 */
export async function payForSeat(booking: ShuttleBooking): Promise<ShuttleBooking> {
  if (!booking.checkout) {
    return booking;
  }

  // Prefill saves the rider typing their own email at a payment sheet. A nicety, so a profile
  // that fails to load must not stop them paying.
  const profile = await getProfile().catch(() => null);

  let paymentId: string;
  try {
    const result = await RazorpayCheckout.open({
      key: booking.checkout.gatewayKeyId,
      order_id: booking.checkout.gatewayOrderId,
      amount: booking.checkout.amountMinor,
      currency: booking.checkout.currency,
      name: 'RideX',
      description: `${booking.routeName} · seat ${booking.seatLabel}`,
      ...(CHECKOUT_LOGO ? { image: CHECKOUT_LOGO } : {}),
      theme: { color: '#2EE7C7' },
      // Saved cards run through Razorpay's own customer login, which sends an OTP and fails with
      // "Login Failed" in test mode. Nothing here needs a card on file.
      remember_customer: false,
      // Shown against the payment in the Razorpay dashboard, which is where a disputed charge is
      // looked up. Without them a refund request is an amount and a date.
      notes: {
        bookingId: booking.id,
        route: booking.routeName,
        seat: booking.seatLabel,
      },
      prefill: {
        name: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || undefined,
        email: profile?.email ?? undefined,
        contact: profile?.phone ?? undefined,
      },
    });
    paymentId = result.razorpay_payment_id;
  } catch {
    // Dismissed, or the payment failed at the gateway. Either way nothing was captured.
    return booking;
  }

  try {
    return await confirmShuttlePayment(booking.id, paymentId);
  } catch (caught) {
    // The money may well have been taken. The webhook confirms the seat either way, so this is
    // reported rather than treated as a failed booking.
    throw caught instanceof ApiError
      ? caught
      : new Error('Payment went through but the seat could not be confirmed. Check My Rides.');
  }
}
