package com.ridex.ride;

import java.time.Instant;
import java.util.Currency;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.dispatch.DispatchTrigger;
import com.ridex.points.PointsService;
import com.ridex.pricing.FareEstimateRepository;
import com.ridex.pricing.domain.FareEstimate;
import com.ridex.pricing.dto.FareLineResponse;
import com.ridex.ride.domain.CancellationPolicy;
import com.ridex.ride.domain.CancellationReason;
import com.ridex.ride.domain.CancelledBy;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.ride.dto.CancelRideRequest;
import com.ridex.ride.dto.CancellationQuote;
import com.ridex.ride.dto.CancellationReasonResponse;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.ride.dto.RideResponse;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shared.money.Money;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RideRequestService {

    private final RideRequestRepository rideRequestRepository;
    private final CancellationPolicyRepository cancellationPolicyRepository;
    private final FareEstimateRepository fareEstimateRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final com.ridex.payment.OutstandingPayments outstandingPayments;
    private final DispatchTrigger dispatchTrigger;
    private final PointsService pointsService;
    private final com.ridex.payment.PaymentService paymentService;

    /** The zone a cancellation date is written in, for the line the rider reads on their next fare. */
    @org.springframework.beans.factory.annotation.Value("${app.reporting.zone:Asia/Kolkata}")
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
                ? com.ridex.payment.domain.PaymentMethod.CASH
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
            int spent = pointsService.redeem(riderUserId, requested, ride.getId());
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

        rideRequestRepository.save(ride);

        // A driver was already on their way, so the fee is real. Nothing can be collected now -
        // there is no card on file at this moment - so it is carried onto the next fare, which is
        // what the rider was told when they confirmed.
        if (fee.amountMinor() > 0) {
            paymentService.recordDue(ride.getRider().getId(), fee,
                    "Cancellation fee for a ride on "
                            + java.time.format.DateTimeFormatter.ofPattern("d MMM")
                                    .withZone(java.time.ZoneId.of(serviceZone)).format(now),
                    "RIDE_CANCELLATION", ride.getId());
        }

        return toResponse(ride);
    }

    /** The reasons the app offers, from the server, so both sides can never drift apart. */
    public List<CancellationReasonResponse> cancellationReasons() {
        return java.util.Arrays.stream(CancellationReason.values())
                .map(reason -> new CancellationReasonResponse(
                        reason.name(), reason.label(), reason.needsDetail()))
                .toList();
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
    private Money feeFor(RideRequest ride, CancelledBy by, Instant now) {
        Currency currency = Currency.getInstance(ride.getCurrency());
        return cancellationPolicyRepository
                .findByCancelledByAndFromStatusAndActiveTrue(by, ride.getStatus())
                // Assignment time arrives with dispatch; until then nothing has been spent on the
                // rider's behalf, so the grace window has not started.
                .map(policy -> policy.feeFor(null, now))
                .orElse(Money.zero(currency));
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
                ride.getRequestedAt());
    }
}
