package com.ridex.payment;

import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.payment.domain.Payment;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.payment.domain.PaymentStatus;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shared.money.Money;

import lombok.RequiredArgsConstructor;

/**
 * The money side of a shuttle seat.
 *
 * <p>Separate from {@link PaymentService} because a seat is charged on a different clock: a trip is
 * paid for after it happened and priced from what was driven, while a seat is published in advance
 * and paid for before anybody moves - which is why it can be held, abandoned, expired and settled
 * at the door, none of which a ride can do.
 */
@Service
@RequiredArgsConstructor
public class ShuttlePaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentProviders providers;

    /** Handed to the client to open checkout. Publishable - it identifies, it does not authorise. */
    @Value("${app.razorpay.key-id:}")
    private String razorpayKeyId;

    /**
     * Opens checkout for a shuttle seat.
     *
     * <p>Unlike a trip, this runs <em>before</em> the service: the fare is published in advance and
     * the seat is inventory somebody else wants, so the order is created the moment the seat is
     * held. Idempotent on the booking, because a retried booking call must not open a second order
     * for the same seat.
     */
    @Transactional
    public ShuttleCheckout startShuttlePayment(String bookingId, RiderProfile rider, Money gross,
            Money discount, PaymentMethod method) {
        return start(Subject.seat(bookingId), rider, gross, discount, method);
    }

    /**
     * Opens checkout for a commuter pass.
     *
     * <p>Online only: a pass is prepaid and there is no driver standing there to hand cash to, so
     * unlike a seat it has no cash path to fall back on.
     */
    @Transactional
    public ShuttleCheckout startPassPayment(String passId, RiderProfile rider, Money price,
            Money discount, PaymentMethod method) {
        if (method == PaymentMethod.CASH) {
            throw new ValidationException("A pass is paid for online.");
        }
        return start(Subject.pass(passId), rider, price, discount, method);
    }

    private ShuttleCheckout start(Subject subject, RiderProfile rider, Money gross,
            Money discount, PaymentMethod method) {
        Money amount = gross.minus(discount);
        Payment existing = subject.find(paymentRepository).orElse(null);
        if (existing != null) {
            return new ShuttleCheckout(existing.getProviderPaymentId(), razorpayKeyId,
                    existing.getNetAmountMinor(), existing.getCurrency(), existing.getStatus());
        }

        PaymentProvider provider = providers.forMethod(method);
        String idempotencyKey = subject.idempotencyKey();
        var intent = provider.createPaymentIntent(amount, subject.id(), idempotencyKey);

        Payment payment = new Payment();
        subject.stamp(payment);
        payment.setRider(rider);
        payment.setMethod(method);
        payment.setProvider(provider.name());
        payment.setCurrency(amount.currency().getCurrencyCode());
        payment.setGrossAmountMinor(gross.amountMinor());
        // Funded by the platform, exactly as on a ride: points are a discount, not a smaller fare.
        payment.setDiscountAmountMinor(discount.amountMinor());
        payment.setNetAmountMinor(amount.amountMinor());
        payment.setProviderPaymentId(intent.providerPaymentId());
        payment.setIdempotencyKey(idempotencyKey);
        // Cash is owed, not authorised: the row exists so the fare is on the books, and it only
        // becomes SUCCEEDED when the driver has actually been handed the money at the door.
        payment.setStatus(PaymentStatus.CREATED);
        paymentRepository.save(payment);

        return new ShuttleCheckout(
                method == PaymentMethod.CASH ? null : intent.providerPaymentId(),
                method == PaymentMethod.CASH ? null : razorpayKeyId,
                amount.amountMinor(), amount.currency().getCurrencyCode(), payment.getStatus());
    }

    /**
     * Confirms a seat's payment against the gateway.
     *
     * <p>The gateway is asked, the app is not believed - the same rule as a trip. Returns the
     * status the payment actually landed on, which is what decides whether the seat is confirmed.
     */
    @Transactional
    public PaymentStatus confirmShuttlePayment(String bookingId, String gatewayPaymentId) {
        return confirm(Subject.seat(bookingId), gatewayPaymentId);
    }

    /** The same for a pass: the gateway is asked, the app is not believed. */
    @Transactional
    public PaymentStatus confirmPassPayment(String passId, String gatewayPaymentId) {
        return confirm(Subject.pass(passId), gatewayPaymentId);
    }

    private PaymentStatus confirm(Subject subject, String gatewayPaymentId) {
        Payment payment = subject.find(paymentRepository)
                .orElseThrow(() -> new NotFoundException("That purchase has no payment."));

        if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
            return PaymentStatus.SUCCEEDED;
        }

        var confirmed = providers.forMethod(payment.getMethod()).confirmPayment(gatewayPaymentId);

        switch (confirmed.status()) {
            case "SUCCEEDED" -> {
                if (!confirmed.isFor(payment.getProviderPaymentId(), payment.getNetAmountMinor())) {
                    throw new ValidationException("That payment is not for this purchase.");
                }
                payment.setStatus(PaymentStatus.SUCCEEDED);
                payment.setPaidAt(Instant.now());
                // The order id was a placeholder until somebody paid; the payment id is what every
                // webhook and any refund will name.
                payment.setProviderPaymentId(gatewayPaymentId);
            }
            case "FAILED" -> {
                payment.setStatus(PaymentStatus.FAILED);
                payment.setFailureReason(confirmed.failureReason());
            }
            default -> payment.setStatus(PaymentStatus.PROCESSING);
        }

        paymentRepository.save(payment);
        return payment.getStatus();
    }

    /**
     * Closes an unpaid seat payment, so it stops counting as a fare the rider owes.
     *
     * <p>Without this an abandoned checkout blocks every later booking: the outstanding check sees
     * a payment that was created and never captured and, correctly, refuses to let somebody who
     * walked away from a fare start another journey. The seat is gone; the debt should be too.
     */
    @Transactional
    public void voidShuttlePayment(String bookingId, String reason) {
        paymentRepository.findByShuttleBookingId(bookingId).ifPresent(payment -> {
            if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
                return;
            }
            payment.setStatus(PaymentStatus.CANCELLED);
            payment.setFailureReason(reason);
            paymentRepository.save(payment);
        });
    }

    /**
     * The open checkout for a seat that has not been paid for.
     *
     * <p>Returned with every unpaid booking, not just the one that has just been made: a rider who
     * backed out of checkout reopens the ticket from their rides, and without the order id there
     * is nothing on that screen they can pay with.
     */
    @Transactional(readOnly = true)
    public ShuttleCheckout checkoutFor(String bookingId) {
        return paymentRepository.findByShuttleBookingId(bookingId)
                .filter(payment -> payment.getMethod() != PaymentMethod.CASH)
                .filter(payment -> payment.getStatus() != PaymentStatus.SUCCEEDED)
                .map(payment -> new ShuttleCheckout(payment.getProviderPaymentId(), razorpayKeyId,
                        payment.getNetAmountMinor(), payment.getCurrency(), payment.getStatus()))
                .orElse(null);
    }

    /** The open checkout for a pass that has not been paid for, or null once it has. */
    @Transactional(readOnly = true)
    public ShuttleCheckout passCheckoutFor(String passId) {
        return paymentRepository.findByPassId(passId)
                .filter(payment -> payment.getStatus() != PaymentStatus.SUCCEEDED)
                .map(payment -> new ShuttleCheckout(payment.getProviderPaymentId(), razorpayKeyId,
                        payment.getNetAmountMinor(), payment.getCurrency(), payment.getStatus()))
                .orElse(null);
    }

    /** Enough of a seat's payment to put on its invoice: how it was paid, and the reference. */
    @Transactional(readOnly = true)
    public ShuttlePaymentSummary shuttlePaymentSummary(String bookingId) {
        return paymentRepository.findByShuttleBookingId(bookingId)
                .map(payment -> new ShuttlePaymentSummary(payment.getMethod(), payment.getStatus(),
                        payment.getProviderPaymentId(), payment.getProvider()))
                .orElse(null);
    }

    /** @param reference the gateway's own id, which is what a disputed charge is looked up by. */
    public record ShuttlePaymentSummary(PaymentMethod method, PaymentStatus status,
            String reference, String provider) {
    }

    /** What the app needs to open checkout for a seat, and nothing it should not have. */
    public record ShuttleCheckout(String gatewayOrderId, String gatewayKeyId,
            long amountMinor, String currency, PaymentStatus status) {
    }

    /**
     * What a prepaid payment is for.
     *
     * <p>A seat and a pass are charged identically - held, paid online, confirmed against the
     * gateway - and differ only in which column names them. Keeping that difference in one place
     * is what stops the two paths drifting the first time one of them is fixed.
     */
    private record Subject(String id, String keyPrefix, boolean isPass) {

        static Subject seat(String bookingId) {
            return new Subject(bookingId, "shuttle-payment:", false);
        }

        static Subject pass(String passId) {
            return new Subject(passId, "pass-payment:", true);
        }

        java.util.Optional<Payment> find(PaymentRepository payments) {
            return isPass ? payments.findByPassId(id) : payments.findByShuttleBookingId(id);
        }

        void stamp(Payment payment) {
            if (isPass) {
                payment.setPassId(id);
            } else {
                payment.setShuttleBookingId(id);
            }
        }

        String idempotencyKey() {
            return keyPrefix + id;
        }
    }
}
