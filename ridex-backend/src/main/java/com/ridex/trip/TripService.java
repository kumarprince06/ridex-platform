package com.ridex.trip;

import java.time.Instant;
import java.util.Currency;
import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.pricing.PricingRuleRepository;
import com.ridex.pricing.domain.Fare;
import com.ridex.pricing.domain.FareCalculator;
import com.ridex.notification.DeliveryChannel;
import com.ridex.notification.Notifier;
import com.ridex.pricing.domain.FareLine;
import com.ridex.pricing.dto.FareLineResponse;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.payment.PaymentService;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.points.PointsService;
import com.ridex.shared.util.OtpGenerator;
import com.ridex.trip.domain.ActorType;
import com.ridex.trip.domain.Trip;
import com.ridex.trip.domain.TripFareLine;
import com.ridex.trip.domain.TripStatusHistory;
import com.ridex.trip.dto.CompleteTripRequest;
import com.ridex.trip.dto.FareComparisonResponse;
import com.ridex.trip.dto.StartTripRequest;
import com.ridex.trip.dto.TripResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TripService {

    /**
     * How far past the quoted route the reported distance may go before it is capped.
     *
     * <p>The driver's app is the only thing that was there, so its number is used - but not
     * blindly. Without a bound, a wrong odometer or a tampered client prices the ride.
     */
    private static final double MAX_DISTANCE_OVERRUN = 2.0;

    private final TripRepository tripRepository;
    private final TripStatusHistoryRepository tripStatusHistoryRepository;
    private final RideRequestRepository rideRequestRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PickupCodeAttempts pickupCodeAttempts;
    private final PointsService pointsService;
    private final PaymentService paymentService;
    private final Notifier notifier;

    /**
     * Creates the trip and its pickup code the moment a driver is assigned.
     *
     * @return the raw six digits, for the rider's screen and QR. Never stored, never logged.
     */
    @Transactional
    public String createForAssignedRide(String rideId) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new NotFoundException("No such ride."));

        DriverProfile driver = driverProfileRepository.findById(ride.getAssignedDriverId())
                .orElseThrow(() -> new NotFoundException("That ride has no driver."));

        String pickupCode = OtpGenerator.generate();

        Trip trip = new Trip();
        trip.setRideRequest(ride);
        trip.setDriver(driver);
        trip.setPickupCodeHash(passwordEncoder.encode(pickupCode));
        trip.setCurrency(ride.getCurrency());
        tripRepository.save(trip);

        record(trip, null, ride.getStatus(), ActorType.SYSTEM, null, "driver assigned");
        return pickupCode;
    }

    /** The driver is at the pickup point. The waiting clock starts here, on the server's word. */
    @Transactional
    public TripResponse arrive(String driverUserId, String tripId) {
        Trip trip = requireOwnTrip(driverUserId, tripId);
        RideRequest ride = trip.getRideRequest();

        RideStatus from = ride.getStatus();
        if (from == RideStatus.DRIVER_ASSIGNED) {
            ride.transitionTo(RideStatus.DRIVER_ARRIVING);
        }
        ride.transitionTo(RideStatus.DRIVER_AT_PICKUP);

        trip.setArrivedAt(Instant.now());
        rideRequestRepository.save(ride);
        tripRepository.save(trip);

        record(trip, from, ride.getStatus(), ActorType.DRIVER, trip.getDriver().getId(), null);
        return toResponse(trip);
    }

    /**
     * Starts the trip, once the pickup code checks out.
     *
     * <p>The same code whether it came from a scan or the keypad. The server decides whether it
     * matches - a client that decided would let a driver start a trip nobody boarded, which is a
     * fare.
     */
    @Transactional
    public TripResponse start(String driverUserId, String tripId, StartTripRequest request) {
        Trip trip = requireOwnTrip(driverUserId, tripId);
        RideRequest ride = trip.getRideRequest();

        if (trip.pickupCodeIsBurned()) {
            throw new ConflictException(
                    "Too many incorrect codes. Ask the rider to reopen their booking.");
        }

        if (!passwordEncoder.matches(request.pickupCode(), trip.getPickupCodeHash())) {
            // On its own transaction: this one is about to roll back, and an increment that rolls
            // back with it means the cap counts nothing.
            pickupCodeAttempts.recordFailure(tripId);
            throw new ConflictException("That pickup code is not correct.");
        }

        RideStatus from = ride.getStatus();
        ride.transitionTo(RideStatus.TRIP_STARTED);

        Instant now = Instant.now();
        trip.setWaitingSeconds(trip.waitedSecondsAt(now));
        trip.setStartedAt(now);

        rideRequestRepository.save(ride);
        tripRepository.save(trip);

        record(trip, from, ride.getStatus(), ActorType.DRIVER, trip.getDriver().getId(), null);
        return toResponse(trip);
    }

    /** Ends the trip and prices it from what actually happened, not from the quote. */
    @Transactional
    public TripResponse complete(String driverUserId, String tripId, CompleteTripRequest request) {
        Trip trip = requireOwnTrip(driverUserId, tripId);
        RideRequest ride = trip.getRideRequest();

        RideStatus from = ride.getStatus();
        ride.transitionTo(RideStatus.COMPLETED);

        int quotedDistance = ride.getFareEstimate().getDistanceMeters();
        // Bounded, not trusted: a broken odometer must not be able to invent a fare.
        int distance = Math.min(request.distanceMeters(), (int) (quotedDistance * MAX_DISTANCE_OVERRUN));

        var rule = pricingRuleRepository.findInForce(ride.getRideType().getId(), Instant.now())
                .orElseThrow(() -> new ConflictException("No pricing is in force for that ride type."));

        Fare fare = FareCalculator.calculate(
                rule.toRates(), distance, request.durationSeconds(), trip.getWaitingSeconds());

        trip.setActualDistanceMeters(distance);
        trip.setActualDurationSeconds(request.durationSeconds());
        trip.setCompletedAt(Instant.now());
        trip.setFinalFareMinor(fare.total().amountMinor());

        for (FareLine line : fare.lines()) {
            TripFareLine row = new TripFareLine();
            row.setLineType(line.type());
            row.setLabel(line.label());
            row.setAmountMinor(line.amount().amountMinor());
            row.setCurrency(line.amount().currency().getCurrencyCode());
            row.setSortOrder((short) line.sortOrder());
            trip.addFareLine(row);
        }

        rideRequestRepository.save(ride);
        tripRepository.save(trip);

        record(trip, from, ride.getStatus(), ActorType.DRIVER, trip.getDriver().getId(), null);

        // Charge, split and book the money. The discount the rider redeemed at booking is passed
        // through: the driver is still paid on the gross, and the platform funds the difference.
        // ponytail: cash only. A card gateway is another PaymentProvider, not a change here.
        // The method the rider chose at booking, not a constant: an online rider gets an order to
        // pay against, a cash rider has already handed the money over.
        paymentService.settleTrip(trip.getId(), ride.getDiscountMinor(), ride.getPaymentMethod());

        emailReceipt(trip, fare);

        // A driver referral is progress, not a payment: the referrer is paid only after the
        // referred driver has done a run of real trips inside the window.
        long referralPayout = pointsService.recordDriverTripForReferral(
                trip.getDriver().getUser().getId());
        if (referralPayout > 0) {
            paymentService.payDriverReferral(
                    pointsService.referrerOf(trip.getDriver().getUser().getId()),
                    referralPayout, trip.getCurrency());
        }

        // Points for the ride, and a pending referral settles here if this was the rider's first.
        // Awarding on completion rather than on signup means a referral pays for a rider, not for
        // an account somebody manufactured.
        pointsService.awardForCompletedRide(
                ride.getRider().getUser().getId(), ride.getId());

        return toResponse(trip);
    }

    /**
     * The receipt: quote against charge, line for line.
     *
     * <p>Only possible because the estimate was stored rather than overwritten - which is exactly
     * what a single fare_total column would have prevented.
     */
    @Transactional(readOnly = true)
    public FareComparisonResponse receipt(String rideId) {
        Trip trip = tripRepository.findByRideRequestId(rideId)
                .orElseThrow(() -> new NotFoundException("No trip for that ride."));

        if (trip.getFinalFareMinor() == null) {
            throw new ConflictException("That trip has not finished yet.");
        }

        var estimate = trip.getRideRequest().getFareEstimate();
        List<FareLineResponse> quoted = estimate.getLines().stream()
                .map(line -> new FareLineResponse(
                        line.getLineType(), line.getLabel(), line.getAmountMinor()))
                .toList();
        List<FareLineResponse> charged = trip.getFareLines().stream()
                .map(line -> new FareLineResponse(
                        line.getLineType(), line.getLabel(), line.getAmountMinor()))
                .toList();

        return new FareComparisonResponse(
                trip.getCurrency(),
                estimate.getTotalMinor(),
                trip.getFinalFareMinor(),
                trip.getFinalFareMinor() - estimate.getTotalMinor(),
                estimate.getDistanceMeters(),
                trip.getActualDistanceMeters() == null ? 0 : trip.getActualDistanceMeters(),
                quoted,
                charged);
    }

    private void record(Trip trip, RideStatus from, RideStatus to, ActorType actorType,
            String actorId, String reason) {
        TripStatusHistory history = new TripStatusHistory();
        history.setTripId(trip.getId());
        history.setFromStatus(from);
        history.setToStatus(to);
        history.setActorType(actorType);
        history.setActorId(actorId);
        history.setReason(reason);
        tripStatusHistoryRepository.save(history);
    }

    /**
     * Queues the receipt.
     *
     * <p>The lines are flattened into the outbox payload rather than looked up at send time: the
     * dispatcher may run hours later after a mail outage, and a receipt must say what was charged
     * then, not what the pricing rules say now.
     */
    private void emailReceipt(Trip trip, Fare fare) {
        String currency = fare.total().currency().getCurrencyCode();
        StringBuilder payload = new StringBuilder(money(fare.total().amountMinor(), currency))
                .append('\n');

        for (FareLine line : fare.lines()) {
            payload.append(line.label()).append('|')
                    .append(money(line.amount().amountMinor(), currency)).append('\n');
        }
        payload.append("Total|").append(money(fare.total().amountMinor(), currency));

        notifier.enqueue(DeliveryChannel.EMAIL,
                trip.getRideRequest().getRider().getUser().getEmail(),
                "RIDE_RECEIPT", payload.toString());
    }

    /** Minor units to a display string. The currency is on the fare, never assumed. */
    private static String money(long amountMinor, String currency) {
        return "%s %s".formatted(currency,
                java.math.BigDecimal.valueOf(amountMinor, 2).toPlainString());
    }

    private Trip requireOwnTrip(String driverUserId, String tripId) {
        DriverProfile driver = driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."));
        return tripRepository.findByIdAndDriverId(tripId, driver.getId())
                .orElseThrow(() -> new NotFoundException("No such trip."));
    }

    private TripResponse toResponse(Trip trip) {
        return new TripResponse(
                trip.getId(),
                trip.getRideRequest().getId(),
                trip.getRideRequest().getStatus(),
                trip.getArrivedAt(),
                trip.getStartedAt(),
                trip.getCompletedAt(),
                trip.getWaitingSeconds(),
                trip.getCurrency(),
                trip.getFinalFareMinor());
    }

    Currency currencyOf(Trip trip) {
        return Currency.getInstance(trip.getCurrency());
    }
}
