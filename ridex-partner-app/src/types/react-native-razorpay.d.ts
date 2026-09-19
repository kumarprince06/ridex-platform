/** The package ships no types. Only the two calls this app makes are declared. */
declare module 'react-native-razorpay' {
  export type CheckoutOptions = {
    key: string;
    order_id: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    /** A public URL. Razorpay fetches it, so a bundled asset cannot be used. */
    image?: string;
    theme?: { color?: string };
    /** False keeps checkout off Razorpay's saved-card login, which needs its own OTP. */
    remember_customer?: boolean;
    /** Carried onto the payment in the dashboard. */
    notes?: Record<string, string>;
    prefill?: { email?: string; contact?: string; name?: string };
  };

  export type CheckoutSuccess = {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  };

  const RazorpayCheckout: {
    open(options: CheckoutOptions): Promise<CheckoutSuccess>;
  };

  export default RazorpayCheckout;
}
