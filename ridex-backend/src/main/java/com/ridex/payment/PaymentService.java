package com.ridex.payment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Currency;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.payment.domain.*;
import com.ridex.payment.dto.EarningsResponse;
import com.ridex.payment.dto.EarningLineResponse;
import com.ridex.payment.dto.PaymentResponse;
import com.ridex.payment.dto.RidePaymentResponse;
import com.ridex.platform.settings.SettingsService;
import com.ridex.ride.domain.RideRequest;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.money.Money;
import com.ridex.trip.TripRepository;
import com.ridex.trip.domain.Trip;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Charges a finished trip and books the money.
 *
 * <p>The rule that matters most here: <b>a rider's discount comes out of the platform's share, not
 * the driver's.</b> The driver is paid commission on the gross fare, whatever the rider actually
 * handed over. Anything else means drivers fund the loyalty programme, and they will notice.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final DriverEarningRepository driverEarningRepository;
    private final TripRepository tripRepository;
    private final LedgerService ledger;
    private final RiderDueRepository riderDueRepository;

    /** Which gateway clears cards and UPI. One property, so a swap needs no code change. */
    @org.springframework.beans.factory.annotation.Value("${app.payments.gateway:RAZORPAY}")
    private String gateway;

    /** Handed to the client to open checkout. Publishable - it identifies, it does not authorise. */
    @org.springframework.beans.factory.annotation.Value("${app.razorpay.key-id:}")
    private String razorpayKeyId;
    private final SettingsService settings;
    private final List<PaymentProvider> providers;
    private final com.ridex.driver.DriverProfileRepository driverProfileRepository;

    /**
     * Settles a completed trip: one payment, one earnings record, and the ledger entries for both.
     *
     * @param discountMinor what points and promotions took off. Funded by the platform.
     */
    @Transactional
    public PaymentResponse settleTrip(String tripId, long discountMinor, PaymentMethod method) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new NotFoundException("No such trip."));

        if (trip.getFinalFareMinor() == null) {
            throw new ConflictException("That trip has not finished yet.");
        }
        // One payment per trip. A second is a bug, and the unique constraint agrees.
        if (paymentRepository.findByTripId(tripId).isPresent()) {
            return toResponse(paymentRepository.findByTripId(tripId).orElseThrow());
        }

        Currency currency = Currency.getInstance(trip.getCurrency());
        Money gross = Money.of(trip.getFinalFareMinor(), currency);
        // Never below zero: a discount larger than the fare is a free ride, not a payout.
        Money discount = Money.of(Math.min(discountMinor, gross.amountMinor()), currency);
        Money net = gross.minus(discount);

        // What the rider owes from an earlier cancellation rides along with this fare. Added to
        // what is collected, never to gross: gross is what the driver is paid commission on, and
        // a fee for a ride they never drove is not theirs.
        List<RiderDue> dues = riderDueRepository.findByRiderIdAndStatus(
                trip.getRideRequest().getRider().getId(), "PENDING");
        Money owed = Money.of(dues.stream().mapToLong(RiderDue::getAmountMinor).sum(), currency);
        Money collect = net.plus(owed);

        PaymentProvider provider = providerFor(method);
        String idempotencyKey = "trip-payment:" + tripId;

        var intent = collect.amountMinor() > 0
                ? provider.createPaymentIntent(collect, tripId, idempotencyKey)
                : new PaymentProvider.ProviderPayment(null, "SUCCEEDED", null);

        Payment payment = new Payment();
        payment.setTrip(trip);
        payment.setRider(trip.getRideRequest().getRider());
        payment.setMethod(collect.amountMinor() == 0 ? PaymentMethod.NONE : method);
        payment.setProvider(provider.name());
        payment.setCurrency(currency.getCurrencyCode());
        payment.setGrossAmountMinor(gross.amountMinor());
        payment.setDiscountAmountMinor(discount.amountMinor());
        payment.setNetAmountMinor(collect.amountMinor());
        payment.setProviderPaymentId(intent.providerPaymentId());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setStatus("SUCCEEDED".equals(intent.status())
                ? PaymentStatus.SUCCEEDED : PaymentStatus.PROCESSING);
        if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
            payment.setPaidAt(Instant.now());
        }
        paymentRepository.save(payment);

        recordEarnings(trip, gross, discount, payment);
        settleDues(dues, payment, currency);
        return toResponse(payment);
    }

    /**
     * Records money the rider owes and will pay with their next fare.
     *
     * <p>Keyed on what caused it, so a retried cancellation charges the fee once. Nothing is
     * collected here - there is no card on file at the moment somebody cancels.
     */
    @Transactional
    public void recordDue(String riderProfileId, Money amount, String reason,
            String sourceType, String sourceId) {
        if (amount.amountMinor() <= 0
                || riderDueRepository.findBySourceTypeAndSourceId(sourceType, sourceId).isPresent()) {
            return;
        }

        RiderDue due = new RiderDue();
        due.setRiderId(riderProfileId);
        due.setAmountMinor(amount.amountMinor());
        due.setCurrency(amount.currency().getCurrencyCode());
        due.setReason(reason);
        due.setSourceType(sourceType);
        due.setSourceId(sourceId);
        riderDueRepository.save(due);
    }

    /** What the rider owes before their next ride, so the app can say so rather than surprise them. */
    @Transactional(readOnly = true)
    public Money duesFor(String riderProfileId, String currencyCode) {
        List<RiderDue> dues = riderDueRepository.findByRiderIdAndStatus(riderProfileId, "PENDING");
        return Money.of(dues.stream().mapToLong(RiderDue::getAmountMinor).sum(),
                Currency.getInstance(currencyCode));
    }

    /** Closes the dues this payment collected, and books the money to the platform. */
    private void settleDues(List<RiderDue> dues, Payment payment, Currency currency) {
        for (RiderDue due : dues) {
            due.setStatus("SETTLED");
            due.setSettledPaymentId(payment.getId());
            due.setSettledAt(Instant.now());
            riderDueRepository.save(due);

            // The platform's, not the driver's: nobody drove the ride that was cancelled.
            ledger.credit(LedgerAccountType.PLATFORM, null,
                    Money.of(due.getAmountMinor(), currency),
                    "CANCELLATION_FEE", "RIDE", due.getSourceId(), "cancellation-fee:" + due.getId());
        }
    }

    /**
     * Splits the fare between driver and platform.
     *
     * <p>Commission is taken on <b>gross</b>. If it came off the discounted amount, every point a
     * rider redeemed would come out of the driver's pocket.
     */
    private void recordEarnings(Trip trip, Money gross, Money discount, Payment payment) {
        BigDecimal rate = settings.getDecimal("payments.commission-rate", new BigDecimal("0.20"));
        Money commission = gross.times(rate);
        Money driverNet = gross.minus(commission);

        DriverEarning earning = new DriverEarning();
        earning.setDriver(trip.getDriver());
        earning.setTrip(trip);
        earning.setCurrency(gross.currency().getCurrencyCode());
        earning.setGrossAmountMinor(gross.amountMinor());
        // Stored, so a later rate change cannot rewrite what somebody was already paid.
        earning.setCommissionRate(rate.setScale(4, RoundingMode.HALF_UP));
        earning.setCommissionMinor(commission.amountMinor());
        earning.setNetAmountMinor(driverNet.amountMinor());
        driverEarningRepository.save(earning);

        String driverId = trip.getDriver().getId();
        String tripId = trip.getId();

        // The driver is owed their share of the full fare.
        ledger.credit(LedgerAccountType.DRIVER, driverId, driverNet,
                "TRIP_EARNING", "TRIP", tripId, "driver-earning:" + tripId);

        // The platform keeps its commission and pays for the discount out of it.
        ledger.credit(LedgerAccountType.PLATFORM, null, commission,
                "COMMISSION", "TRIP", tripId, "platform-commission:" + tripId);
        if (discount.amountMinor() > 0) {
            ledger.debit(LedgerAccountType.PLATFORM, null, discount,
                    "DISCOUNT_FUNDED", "TRIP", tripId, "platform-discount:" + tripId);
        }

        // Cash never reached the platform: the driver was handed it, so they owe the commission
        // back rather than being paid out. The entry is what makes that visible at settlement.
        if (payment.getMethod() == PaymentMethod.CASH && payment.getNetAmountMinor() > 0) {
            ledger.debit(LedgerAccountType.DRIVER, driverId,
                    Money.of(payment.getNetAmountMinor(), gross.currency()),
                    "CASH_COLLECTED", "TRIP", tripId, "driver-cash:" + tripId);
        }
    }

    /**
     * Credits a qualified driver referral into the referrer's earnings.
     *
     * <p>Into the ledger rather than paid out on the spot: it settles with their next payout,
     * which is what makes a clawback possible if the referred driver turns out to be fraudulent.
     */
    @Transactional
    public void payDriverReferral(String referrerUserId, long amountMinor, String currencyCode) {
        if (referrerUserId == null || amountMinor <= 0) {
            return;
        }

        driverProfileRepository.findByUserId(referrerUserId).ifPresent(referrer -> {
            Currency currency = Currency.getInstance(currencyCode);
            ledger.credit(LedgerAccountType.DRIVER, referrer.getId(),
                    Money.of(amountMinor, currency), "REFERRAL_REWARD", "REFERRAL",
                    referrer.getId(), "driver-referral:" + referrer.getId() + ":" + referrerUserId);

            ledger.debit(LedgerAccountType.PLATFORM, null, Money.of(amountMinor, currency),
                    "REFERRAL_FUNDED", "REFERRAL", referrer.getId(),
                    "platform-referral:" + referrer.getId() + ":" + referrerUserId);
        });
    }

    @Transactional(readOnly = true)
    public EarningsResponse earningsFor(String driverProfileId, Currency currency) {
        List<EarningLineResponse> lines = driverEarningRepository
                .findTop50ByDriverIdOrderByCreatedAtDesc(driverProfileId).stream()
                .map(earning -> new EarningLineResponse(
                        earning.getTrip().getId(),
                        earning.getGrossAmountMinor(),
                        earning.getCommissionRate(),
                        earning.getCommissionMinor(),
                        earning.getNetAmountMinor(),
                        earning.getCreatedAt()))
                .toList();

        // Every figure derived from the same rows the driver can see, so the total is checkable.
        return new EarningsResponse(
                currency.getCurrencyCode(),
                driverEarningRepository.totalNetFor(driverProfileId),
                ledger.balanceOf(LedgerAccountType.DRIVER, driverProfileId, currency).amountMinor(),
                lines);
    }

    /**
     * The payment for a rider's ride, with what checkout needs to collect it.
     *
     * <p>Scoped to the rider who took the trip: a payment names an amount somebody owes, and a
     * trip id is guessable.
     */
    @Transactional(readOnly = true)
    public RidePaymentResponse forRider(String riderUserId, String rideId) {
        Payment payment = paymentRepository.findByTripId(tripIdFor(riderUserId, rideId))
                .orElseThrow(() -> new NotFoundException("That trip has no payment yet."));

        boolean online = payment.getMethod() != PaymentMethod.CASH
                && payment.getMethod() != PaymentMethod.NONE;

        return new RidePaymentResponse(
                payment.getId(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getCurrency(),
                payment.getNetAmountMinor(),
                online ? payment.getProviderPaymentId() : null,
                online ? razorpayKeyId : null,
                !online || payment.getStatus() == PaymentStatus.SUCCEEDED);
    }

    /**
     * Confirms an online payment against the gateway.
     *
     * <p>The gateway is asked; the client is not believed. Idempotent, because a rider who taps
     * twice or an app that retries on a flaky network must not turn one payment into two.
     */
    @Transactional
    public RidePaymentResponse confirmForRider(String riderUserId, String rideId,
            String gatewayPaymentId) {
        String tripId = tripIdFor(riderUserId, rideId);
        Payment payment = paymentRepository.findByTripId(tripId)
                .orElseThrow(() -> new NotFoundException("That trip has no payment yet."));

        if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
            return forRider(riderUserId, rideId);
        }

        var confirmed = providerFor(payment.getMethod()).confirmPayment(gatewayPaymentId);

        switch (confirmed.status()) {
            case "SUCCEEDED" -> {
                payment.setStatus(PaymentStatus.SUCCEEDED);
                payment.setPaidAt(Instant.now());
                // Overwritten deliberately: the order id was a placeholder until somebody paid,
                // and the payment id is what a refund and every webhook will name.
                payment.setProviderPaymentId(gatewayPaymentId);
            }
            case "FAILED" -> {
                payment.setStatus(PaymentStatus.FAILED);
                payment.setFailureReason(confirmed.failureReason());
            }
            // Authorised but not captured yet. Left alone: the webhook moves it when it settles.
            default -> payment.setStatus(PaymentStatus.PROCESSING);
        }

        paymentRepository.save(payment);
        return forRider(riderUserId, rideId);
    }

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
        Money amount = gross.minus(discount);
        Payment existing = paymentRepository.findByShuttleBookingId(bookingId).orElse(null);
        if (existing != null) {
            return new ShuttleCheckout(existing.getProviderPaymentId(), razorpayKeyId,
                    existing.getNetAmountMinor(), existing.getCurrency(), existing.getStatus());
        }

        PaymentProvider provider = providerFor(method);
        String idempotencyKey = "shuttle-payment:" + bookingId;
        var intent = provider.createPaymentIntent(amount, bookingId, idempotencyKey);

        Payment payment = new Payment();
        payment.setShuttleBookingId(bookingId);
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
        Payment payment = paymentRepository.findByShuttleBookingId(bookingId)
                .orElseThrow(() -> new NotFoundException("That seat has no payment."));

        if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
            return PaymentStatus.SUCCEEDED;
        }

        var confirmed = providerFor(payment.getMethod()).confirmPayment(gatewayPaymentId);

        switch (confirmed.status()) {
            case "SUCCEEDED" -> {
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

    /** Records the fare a driver collected in cash for a seat, once the passenger is on board. */
    @Transactional
    public void settleShuttleCash(String bookingId) {
        paymentRepository.findByShuttleBookingId(bookingId).ifPresent(payment -> {
            if (payment.getMethod() != PaymentMethod.CASH
                    || payment.getStatus() == PaymentStatus.SUCCEEDED) {
                return;
            }
            payment.setStatus(PaymentStatus.SUCCEEDED);
            payment.setPaidAt(Instant.now());
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

    /** Resolves the rider's own ride to its trip, refusing anybody else's. */
    private String tripIdFor(String riderUserId, String rideId) {
        return tripRepository.findByRideRequestId(rideId)
                .filter(trip -> trip.getRideRequest().getRider().getUser().getId().equals(riderUserId))
                .orElseThrow(() -> new NotFoundException("No such trip."))
                .getId();
    }

    @Transactional(readOnly = true)
    public PaymentResponse forTrip(String tripId) {
        return toResponse(paymentRepository.findByTripId(tripId)
                .orElseThrow(() -> new NotFoundException("No payment for that trip.")));
    }

    /**
     * Which gateway settles this method.
     *
     * <p>Cash has no gateway - the driver is handed the money - so it routes to its own provider.
     * Everything else goes to the configured one, because the rider is choosing an instrument
     * (UPI, card, netbanking) inside a checkout, not choosing a gateway: every gateway offers all
     * of them, and which company clears the money is the platform's decision, not theirs.
     *
     * <p>Named in configuration rather than in code so adding a second gateway is a new class and
     * one property, with nothing above this line to change.
     */
    private PaymentProvider providerFor(PaymentMethod method) {
        String wanted = method == PaymentMethod.CASH ? "CASH" : gateway;

        return providers.stream()
                .filter(provider -> provider.name().equals(wanted))
                .findFirst()
                .orElseThrow(() -> new ConflictException(
                        "No payment provider is configured for " + method + "."));
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getTrip() == null ? null : payment.getTrip().getId(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getCurrency(),
                payment.getGrossAmountMinor(),
                payment.getDiscountAmountMinor(),
                payment.getNetAmountMinor(),
                payment.getPaidAt());
    }
}
