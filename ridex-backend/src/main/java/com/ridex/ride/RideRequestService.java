package com.ridex.ride;

import java.time.Instant;
import java.util.Currency;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.pricing.FareEstimateRepository;
import com.ridex.pricing.domain.FareEstimate;
import com.ridex.pricing.dto.FareLineResponse;
import com.ridex.ride.domain.CancellationPolicy;
import com.ridex.ride.domain.CancelledBy;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.ride.dto.CancelRideRequest;
import com.ridex.ride.dto.CancellationQuote;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.ride.dto.RideResponse;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.money.Money;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RideRequestService {

    private final RideRequestRepository rideRequestRepository;
    private final CancellationPolicyRepository cancellationPolicyRepository;
    private final FareEstimateRepository fareEstimateRepository;
    private final RiderProfileRepository riderProfileRepository;

    /** Turns a quote the rider chose into a request. The price comes from the quote, never the body. */
    @Transactional
    public RideResponse create(String riderUserId, CreateRideRequest request) {
        RiderProfile rider = requireRider(riderUserId);

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
        ride.setQuotedFareMinor(estimate.getTotalMinor());

        // Straight to SEARCHING: a request nobody is looking for a driver for is a request that
        // sits there. Dispatch picks it up from this status.
        ride.transitionTo(RideStatus.SEARCHING);

        rideRequestRepository.save(ride);
        return toResponse(ride);
    }

    @Transactional(readOnly = true)
    public List<RideResponse> list(String riderUserId) {
        return rideRequestRepository.findByRiderIdOrderByRequestedAtDesc(requireRider(riderUserId).getId())
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

        Instant now = Instant.now();
        Money fee = feeFor(ride, CancelledBy.RIDER, now);
        ride.cancel(CancelledBy.RIDER, request.reason(), fee.amountMinor(), now);

        rideRequestRepository.save(ride);
        return toResponse(ride);
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
                ride.getCurrency(),
                ride.getQuotedFareMinor(),
                lines,
                ride.getCancellationFeeMinor(),
                ride.getCancellationReason(),
                ride.getRequestedAt());
    }
}
