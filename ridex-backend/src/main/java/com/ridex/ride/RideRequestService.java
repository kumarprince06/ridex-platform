package com.ridex.ride;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Currency;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.dispatch.DispatchTrigger;
import com.ridex.driver.DriverCard;
import com.ridex.shared.exception.ForbiddenException;
import com.ridex.notification.Notifier;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.location.DriverPresence;
import com.ridex.payment.CancellationSettlement;
import com.ridex.payment.OutstandingPayments;
import com.ridex.payment.PaymentService;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.points.PointsService;
import com.ridex.pricing.FareEstimateRepository;
import com.ridex.pricing.domain.FareEstimate;
import com.ridex.pricing.dto.FareLineResponse;
import com.ridex.ride.domain.CancellationReason;
import com.ridex.ride.domain.CancelledBy;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.ride.dto.CancelRideRequest;
import com.ridex.ride.dto.CancellationQuote;
import com.ridex.ride.dto.CancellationReasonResponse;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.ride.dto.DriverCancellationQuote;
import com.ridex.ride.dto.DriverResponse;
import com.ridex.ride.dto.RideResponse;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shared.money.Money;
import com.ridex.trip.TripRepository;
import com.ridex.trip.domain.Trip;

import lombok.RequiredArgsConstructor;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
public class RideRequestService {

    private final RideRequestRepository rideRequestRepository;
    private final CancellationPolicyRepository cancellationPolicyRepository;
    private final FareEstimateRepository fareEstimateRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final OutstandingPayments outstandingPayments;
    private final DispatchTrigger dispatchTrigger;
    private final PointsService pointsService;
    private final PaymentService paymentService;
    private final TripRepository tripRepository;
    private final DriverCard driverCard;
    private final DriverPresence driverPresence;
    private final DriverProfileRepository driverProfileRepository;
    private final Notifier notifier;
    private final DriverCancellationRules driverCancellationRules;
    private final CancellationSettlement cancellationSettlement;

    /** The zone a cancellation date is written in, for the line the rider reads on their next fare. */
    @Value("${app.reporting.zone:Asia/Kolkata}")
    private String serviceZone;

    /** Turns a quote the rider chose into a request. The price comes from the quote, never the body. */
    @Transactional
    public RideResponse create(String riderUserId, CreateRideRequest request) {
        RiderProfile rider = requireRider(riderUserId);

        // Checked first, before the estimate is even looked up: "you owe for your last ride" is a
        // thing the rider can act on, and it is true whatever is wrong with the quote.
        outstandingPayments.requireNoneFor(rider.getId());

        FareEstimate estimate = fareEstimateRepository.findById(request.estimateId())
                .orElseThrow(() -> new NotFoundException("That estimate no longer exists."));

        // Scoped to the caller: an estimate id is guessable enough that somebody else's quote must
        // not be bookable, even though the price would be theirs and not the attacker's.
        if (!estimate.getRider().getId().equals(rider.getId())) {
            throw new NotFoundException("That estimate no longer exists.");
        }

        // A quote is only honest while traffic and demand hold. Re-quoting is the rider's choice,
        // not something to do silently at a price they never saw.
        if (estimate.isExpiredAt(Instant.now())) {
            throw new ConflictException("That fare estimate has expired. Please get a new one.");
        }

        // The unique constraint enforces this too; checking first turns a 500 into a sentence.
        if (rideRequestRepository.existsByFareEstimateId(estimate.getId())) {
            throw new ConflictException("That estimate has already been used for a ride.");
        }

        RideRequest ride = new RideRequest();
        ride.setRider(rider);
        ride.setRideType(estimate.getRideType());
        ride.setFareEstimate(estimate);
        ride.setPickupLat(estimate.getPickupLat());
        ride.setPickupLng(estimate.getPickupLng());
        ride.setPickupAddress(request.pickupAddress());
        ride.setDestinationLat(estimate.getDestinationLat());
        ride.setDestinationLng(estimate.getDestinationLng());
        ride.setDestinationAddress(request.destinationAddress());
        ride.setCurrency(estimate.getCurrency());
        // Null means cash: the app sent nothing, or it is an older build than this field.
        ride.setPaymentMethod(request.paymentMethod() == null
                ? PaymentMethod.CASH
                : request.paymentMethod());
        ride.setQuotedFareMinor(estimate.getTotalMinor());

        // Straight to SEARCHING: a request nobody is looking for a driver for is a request that
        // sits there. Dispatch picks it up from this status.
        ride.transitionTo(RideStatus.SEARCHING);

        rideRequestRepository.save(ride);

        // Spent now, so the points cannot be used twice on two open bookings. A cancellation
        // refunds them as a new entry rather than deleting this one.
        int requested = request.redeemPoints() == null ? 0 : request.redeemPoints();
        if (requested > 0) {
            // Capped by the fare inside: taking points a fare cannot absorb spends them for nothing.
            int spent = pointsService.redeem(riderUserId, requested, ride.getQuotedFareMinor(),
                    ride.getId());
            ride.setRedeemedPoints(spent);
            ride.setDiscountMinor(pointsService.valueOf(spent));
            rideRequestRepository.save(ride);
        }

        // After commit: dispatch must not offer a ride whose row is not visible yet, and a
        // dispatch failure must not roll back a ride the rider was told was booked.
        dispatchTrigger.afterCommit(ride.getId());

        return toResponse(ride);
    }

    /**
     * The rider's ride history.
     *
     * <p>EXPIRED is left out: that is a search that found nobody, so from the rider's side no ride
     * happened and there is nothing to look back at. The row stays - operations and the analytics
     * that count unserved demand need exactly these, and they are the rows that say where the
     * platform has too few drivers.
     *
     * <p>Only from the list. Fetching one by id still works, because the screen that is watching a
     * search has to be able to read the ride at the moment it expires.
     */
    @Transactional(readOnly = true)
    public List<RideResponse> list(String riderUserId) {
        return rideRequestRepository
                .findByRiderIdAndStatusNotOrderByRequestedAtDesc(
                        requireRider(riderUserId).getId(), RideStatus.EXPIRED)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RideResponse get(String riderUserId, String rideId) {
        return toResponse(requireOwnRide(riderUserId, rideId));
    }

    /** What cancelling costs right now, so the rider is told before confirming rather than after. */
    @Transactional(readOnly = true)
    public CancellationQuote quoteCancellation(String riderUserId, String rideId) {
        RideRequest ride = requireOwnRide(riderUserId, rideId);
        Money fee = feeFor(ride, CancelledBy.RIDER, Instant.now());
        return new CancellationQuote(fee.currency().getCurrencyCode(), fee.amountMinor(),
                fee.amountMinor() == 0);
    }

    @Transactional
    public RideResponse cancel(String riderUserId, String rideId, CancelRideRequest request) {
        RideRequest ride = requireOwnRide(riderUserId, rideId);

        if (ride.getStatus().isTerminal()) {
            throw new ConflictException("That ride has already ended.");
        }
        if (request.isDetailMissing()) {
            throw new ValidationException("Tell us what went wrong, so we can act on it.");
        }

        Instant now = Instant.now();
        Money fee = feeFor(ride, CancelledBy.RIDER, now);
        ride.cancel(CancelledBy.RIDER, request.text(), fee.amountMinor(), now);
        ride.setCancellationReasonCode(request.reasonCode());

        // The ride is not happening, so the points it spent come back - as a new entry, which is
        // what the booking path promised when it took them.
        if (ride.getRedeemedPoints() > 0) {
            pointsService.returnRidePoints(ride.getRider().getUser().getId(),
                    ride.getRedeemedPoints(), ride.getId());
        }

        rideRequestRepository.save(ride);

        // A driver was already on their way, so the fee is real. Nothing can be collected now -
        // there is no card on file at this moment - so it is carried onto the next fare, which is
        // what the rider was told when they confirmed.
        if (fee.amountMinor() > 0) {
            paymentService.recordDue(ride.getRider().getId(), fee,
                    "Cancellation fee for a ride on "
                            + DateTimeFormatter.ofPattern("d MMM")
                                    .withZone(ZoneId.of(serviceZone)).format(now),
                    "RIDE_CANCELLATION", ride.getId());
            // The driver drove to a rider who then cancelled late: most of the fee is theirs.
            if (ride.getAssignedDriverId() != null) {
                cancellationSettlement.shareWithDriver(ride.getAssignedDriverId(), fee, ride.getId());
            }
        }

        return toResponse(ride);
    }

    /** The reasons the app offers, from the server, so both sides can never drift apart. */
    public List<CancellationReasonResponse> cancellationReasons(CancelledBy side) {
        return Arrays.stream(CancellationReason.values())
                .filter(reason -> reason.isFor(side))
                .map(reason -> new CancellationReasonResponse(
                        reason.name(), reason.label(), reason.needsDetail()))
                .toList();
    }

    /**
     * The driver's cancellation.
     *
     * <p>Ends the rider's ride with a stated reason rather than leaving them watching a car that
     * is not coming. No fee is charged to the rider: they did not cancel, and the policy rows for
     * CancelledBy.DRIVER exist so a cancelling driver can be counted, not billed.
     */
    @Transactional
    public RideResponse cancelAsDriver(String driverUserId, String rideId,
            CancelRideRequest request) {
        RideRequest ride = requireAssignedRide(driverUserId, rideId);
        if (!request.reasonCode().isFor(CancelledBy.DRIVER)) {
            throw new ValidationException("That is not a reason a driver can give.");
        }
        if (request.isDetailMissing()) {
            throw new ValidationException("Tell us what went wrong, so we can act on it.");
        }

        Instant now = Instant.now();
        var charge = driverCancellationRules.chargeFor(ride, arrivedAt(ride), request.reasonCode(), now);
        // Read before cancel() moves the status: the no-show fee is the at-pickup rider fee.
        Money riderFee = charge.riderNoShow() ? feeFor(ride, CancelledBy.RIDER, now) : Money.zero(Currency.getInstance(ride.getCurrency()));

        ride.cancel(CancelledBy.DRIVER, request.text(), riderFee.amountMinor(), now);
        ride.setCancellationReasonCode(request.reasonCode());

        if (riderFee.amountMinor() > 0) {
            paymentService.recordDue(ride.getRider().getId(), riderFee, "No-show fee - the driver waited at your pickup",
                    "RIDE_CANCELLATION", ride.getId());
            cancellationSettlement.shareWithDriver(ride.getAssignedDriverId(), riderFee, ride.getId());
        }
        if (charge.penaltyMinor() > 0) {
            cancellationSettlement.penaliseDriver(ride.getAssignedDriverId(),
                    Money.of(charge.penaltyMinor(), Currency.getInstance(ride.getCurrency())), ride.getId());
        }

        if (ride.getRedeemedPoints() > 0) {
            pointsService.returnRidePoints(ride.getRider().getUser().getId(),
                    ride.getRedeemedPoints(), ride.getId());
        }

        rideRequestRepository.save(ride);

        // The rider is watching a map, not their inbox: this is what moves them off it.
        notifier.notifyUser(ride.getRider().getUser().getId(), "RIDE_CANCELLED_BY_DRIVER",
                request.text(), "RIDE", ride.getId());

        return toResponse(ride);
    }

    /** What the rider owes from an earlier cancellation, added to their next fare. */
    @Transactional(readOnly = true)
    public CancellationQuote outstandingDues(String riderUserId) {
        RiderProfile rider = requireRider(riderUserId);
        Money dues = paymentService.duesFor(rider.getId(), "INR");
        return new CancellationQuote(dues.currency().getCurrencyCode(), dues.amountMinor(),
                dues.amountMinor() == 0);
    }

    /**
     * No policy row means no charge. Failing open is deliberate: a missing configuration must not
     * invent a fee, and an uncharged cancellation is cheaper than an unexplained one.
     */
    /** What cancelling now would cost the driver for this reason, from the same rules the cancel uses. */
    @Transactional(readOnly = true)
    public DriverCancellationQuote quoteDriverCancellation(String driverUserId, String rideId,
            CancellationReason reason) {
        RideRequest ride = requireAssignedRide(driverUserId, rideId);
        var charge = driverCancellationRules.chargeFor(ride, arrivedAt(ride), reason, Instant.now());
        return new DriverCancellationQuote(ride.getCurrency(), charge.penaltyMinor(),
                charge.penaltyMinor() == 0, charge.note());
    }

    private RideRequest requireAssignedRide(String driverUserId, String rideId) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new NotFoundException("No such ride."));
        String driverId = driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."))
                .getId();
        if (!driverId.equals(ride.getAssignedDriverId())) {
            throw new ForbiddenException("That ride was assigned to another driver.");
        }
        if (ride.getStatus().isTerminal()) {
            throw new ConflictException("That ride has already ended.");
        }
        return ride;
    }

    private Instant arrivedAt(RideRequest ride) {
        return tripRepository.findByRideRequestId(ride.getId()).map(Trip::getArrivedAt).orElse(null);
    }

    private Money feeFor(RideRequest ride, CancelledBy by, Instant now) {
        Currency currency = Currency.getInstance(ride.getCurrency());
        return cancellationPolicyRepository
                .findByCancelledByAndFromStatusAndActiveTrue(by, ride.getStatus())
                // The grace window runs from assignment; with no driver yet it is always free.
                .map(policy -> policy.feeFor(ride.getAssignedAt(), now))
                .orElse(Money.zero(currency));
    }

    /**
     * The pickup code, while it is still worth anything.
     *
     * <p>Withheld once the ride has ended: a code on a finished trip is not a boarding pass, it is
     * a number in a history screen that somebody could read over a shoulder and try on a driver.
     */
    /** The assigned driver, as the rider reads them. Null while dispatch is still searching. */
    private DriverResponse driverFor(RideRequest ride) {
        var card = driverCard.forDriver(ride.getAssignedDriverId());
        if (card == null) {
            return null;
        }
        // Only while the ride is live: where the driver is stops being the rider's business the
        // moment they get out.
        var position = ride.getStatus().isTerminal()
                ? Optional.<DriverPresence.Position>empty()
                : driverPresence.positionOf(ride.getAssignedDriverId());
        return new DriverResponse(card.name(), card.phone(), card.rating(), card.vehicle(),
                card.registrationNumber(),
                position.map(DriverPresence.Position::latitude).orElse(null),
                position.map(DriverPresence.Position::longitude).orElse(null));
    }

    private String pickupCodeFor(RideRequest ride) {
        if (ride.getStatus().isTerminal()) {
            return null;
        }
        return tripRepository.findByRideRequestId(ride.getId())
                .map(Trip::getPickupCode)
                .orElse(null);
    }

    private RiderProfile requireRider(String riderUserId) {
        return riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));
    }

    private RideRequest requireOwnRide(String riderUserId, String rideId) {
        return rideRequestRepository.findByIdAndRiderId(rideId, requireRider(riderUserId).getId())
                // Same answer whether it does not exist or belongs to somebody else: the
                // difference is not the caller's business.
                .orElseThrow(() -> new NotFoundException("No such ride."));
    }

    private RideResponse toResponse(RideRequest ride) {
        List<FareLineResponse> lines = ride.getFareEstimate().getLines().stream()
                .map(line -> new FareLineResponse(
                        line.getLineType(), line.getLabel(), line.getAmountMinor()))
                .toList();

        return new RideResponse(
                ride.getId(),
                ride.getStatus(),
                ride.getRideType().getCode(),
                ride.getPickupAddress(),
                ride.getDestinationAddress(),
                ride.getPickupLat().doubleValue(),
                ride.getPickupLng().doubleValue(),
                ride.getDestinationLat().doubleValue(),
                ride.getDestinationLng().doubleValue(),
                ride.getCurrency(),
                ride.getQuotedFareMinor(),
                lines,
                ride.getRedeemedPoints(),
                ride.getDiscountMinor(),
                ride.getCancellationFeeMinor(),
                ride.getCancellationReason(),
                pickupCodeFor(ride),
                driverFor(ride),
                ride.getRequestedAt(),
                tripRepository.findByRideRequestId(ride.getId()).map(Trip::getStartedAt).orElse(null));
    }
}
