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
import com.ridex.platform.settings.SettingsService;
import com.ridex.ride.domain.RideRequest;
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

        PaymentProvider provider = providerFor(method);
        String idempotencyKey = "trip-payment:" + tripId;

        var intent = net.amountMinor() > 0
                ? provider.createPaymentIntent(net, tripId, idempotencyKey)
                : new PaymentProvider.ProviderPayment(null, "SUCCEEDED", null);

        Payment payment = new Payment();
        payment.setTrip(trip);
        payment.setRider(trip.getRideRequest().getRider());
        payment.setMethod(net.amountMinor() == 0 ? PaymentMethod.NONE : method);
        payment.setProvider(provider.name());
        payment.setCurrency(currency.getCurrencyCode());
        payment.setGrossAmountMinor(gross.amountMinor());
        payment.setDiscountAmountMinor(discount.amountMinor());
        payment.setNetAmountMinor(net.amountMinor());
        payment.setProviderPaymentId(intent.providerPaymentId());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setStatus("SUCCEEDED".equals(intent.status())
                ? PaymentStatus.SUCCEEDED : PaymentStatus.PROCESSING);
        if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
            payment.setPaidAt(Instant.now());
        }
        paymentRepository.save(payment);

        recordEarnings(trip, gross, discount, payment);
        return toResponse(payment);
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

    @Transactional(readOnly = true)
    public PaymentResponse forTrip(String tripId) {
        return toResponse(paymentRepository.findByTripId(tripId)
                .orElseThrow(() -> new NotFoundException("No payment for that trip.")));
    }

    /**
     * Which gateway settles this method.
     *
     * <p>Cash has no gateway - the driver is handed the money - so it routes to its own provider.
     * Everything else is a card or a UPI collection, which is the same Razorpay call either way:
     * the customer picks the instrument inside checkout, not before it.
     */
    private PaymentProvider providerFor(PaymentMethod method) {
        String wanted = method == PaymentMethod.CASH ? "CASH" : "RAZORPAY";

        return providers.stream()
                .filter(provider -> provider.name().equals(wanted))
                .findFirst()
                .orElseThrow(() -> new ConflictException(
                        "No payment provider is configured for " + method + "."));
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getTrip().getId(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getCurrency(),
                payment.getGrossAmountMinor(),
                payment.getDiscountAmountMinor(),
                payment.getNetAmountMinor(),
                payment.getPaidAt());
    }
}
