package com.ridex.dispatch;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.dispatch.domain.OfferStatus;
import com.ridex.dispatch.domain.RideOffer;
import com.ridex.dispatch.dto.OfferResponse;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.location.DriverPresence;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class DispatchService {

    // Long enough to read the card and decide, short enough that the rider is not left waiting on
    // somebody who put their phone down.
    private static final Duration OFFER_VALIDITY = Duration.ofSeconds(20);

    private final RideOfferRepository rideOfferRepository;
    private final RideRequestRepository rideRequestRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final DriverPresence driverPresence;
    private final OfferNotifier offerNotifier;

    @Value("${app.dispatch.wave-radius-meters:3000}")
    private double waveRadiusMeters;

    @Value("${app.dispatch.wave-size:5}")
    private int waveSize;

    /**
     * Offers a searching ride to the nearest eligible drivers.
     *
     * <p>In waves, not a broadcast: sending every ride to every driver optimises for the platform
     * and teaches drivers to ignore the app.
     */
    // REQUIRES_NEW, not plain @Transactional: this is called from afterCommit, where the old
    // synchronization is still active but its transaction is finished. Joining it means every
    // write here is silently discarded - no exception, no offers, no clue why.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int offerRide(String rideId, int wave) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new NotFoundException("No such ride."));

        if (ride.getStatus() != RideStatus.SEARCHING) {
            // Already assigned or cancelled while this ran. Nothing to do, and not an error.
            return 0;
        }

        List<String> alreadyOffered = rideOfferRepository.findDriverIdsAlreadyOffered(rideId);
        List<String> candidates = driverPresence.nearby(
                ride.getPickupLat().doubleValue(),
                ride.getPickupLng().doubleValue(),
                waveRadiusMeters * wave,
                waveSize * wave + alreadyOffered.size());

        Instant now = Instant.now();
        Instant expiresAt = now.plus(OFFER_VALIDITY);
        List<RideOffer> created = new ArrayList<>();

        for (String driverId : candidates) {
            if (alreadyOffered.contains(driverId) || created.size() >= waveSize) {
                continue;
            }
            driverProfileRepository.findById(driverId)
                    .filter(this::isEligible)
                    .ifPresent(driver -> {
                        RideOffer offer = new RideOffer();
                        offer.setRideRequest(ride);
                        offer.setDriver(driver);
                        offer.setWave((short) wave);
                        offer.setExpiresAt(expiresAt);
                        created.add(rideOfferRepository.save(offer));
                    });
        }

        // Delivery happens after the rows exist, so a driver cannot answer an offer the database
        // has not committed yet.
        created.forEach(offer -> offerNotifier.offered(offer.getDriver().getId(), toResponse(offer)));
        return created.size();
    }

    /**
     * Accepts an offer. The winner is decided by one conditional update, and the loser is told
     * plainly rather than being left to guess.
     */
    @Transactional
    public OfferResponse accept(String driverUserId, String offerId) {
        DriverProfile driver = requireDriver(driverUserId);
        Instant now = Instant.now();

        RideOffer offer = rideOfferRepository.findByIdAndDriverId(offerId, driver.getId())
                .orElseThrow(() -> new NotFoundException("No such offer."));

        if (!offer.isLiveAt(now)) {
            throw new ConflictException("That ride has already been taken.");
        }

        // Claim the ride first. This is the arbiter: two drivers hold two different offers, so
        // only the single ride row can separate them, and queueing here means the loser reads the
        // new status and leaves rather than deadlocking on the offers index.
        int won = rideRequestRepository.assignDriver(
                offer.getRideRequest().getId(), driver.getId(), now,
                RideStatus.SEARCHING, RideStatus.DRIVER_ASSIGNED);

        if (won == 0) {
            // Taken, expired, or cancelled. One message for all three: the driver's next action is
            // the same either way.
            throw new ConflictException("That ride has already been taken.");
        }

        rideOfferRepository.claim(
                offerId, driver.getId(), now, OfferStatus.OFFERED, OfferStatus.ACCEPTED);
        rideOfferRepository.supersedeOthers(
                offer.getRideRequest().getId(), offerId, now,
                OfferStatus.OFFERED, OfferStatus.SUPERSEDED);

        OfferResponse response = toResponse(
                rideOfferRepository.findById(offerId).orElseThrow());
        offerNotifier.taken(offer.getRideRequest().getId(), offerId);
        return response;
    }

    @Transactional
    public void reject(String driverUserId, String offerId) {
        DriverProfile driver = requireDriver(driverUserId);

        // Silent when it was already gone: declining something that expired is not an error the
        // driver should see mid-traffic.
        rideOfferRepository.reject(
                offerId, driver.getId(), Instant.now(), OfferStatus.OFFERED, OfferStatus.REJECTED);
    }

    /** What the app asks for on reconnect: a socket that dropped must not lose a ride. */
    @Transactional(readOnly = true)
    public List<OfferResponse> liveOffers(String driverUserId) {
        return rideOfferRepository
                .findLiveForDriver(requireDriver(driverUserId).getId(), Instant.now(), OfferStatus.OFFERED)
                .stream().map(this::toResponse).toList();
    }

    /**
     * Eligibility, as far as it can be checked today.
     *
     * <p>ponytail: docs/25 also requires every mandatory document valid *now* and one ACTIVE
     * vehicle. Those services do not exist yet (T7), so an approved driver with a lapsed licence
     * would still be offered work. Add both checks here when T7 lands - this is the only place
     * that needs to change.
     */
    private boolean isEligible(DriverProfile driver) {
        return driver.isOnDuty()
                && driver.getOnboardingStatus() == DriverOnboardingStatus.APPROVED;
    }

    private DriverProfile requireDriver(String driverUserId) {
        return driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."));
    }

    private OfferResponse toResponse(RideOffer offer) {
        RideRequest ride = offer.getRideRequest();
        return new OfferResponse(
                offer.getId(),
                ride.getId(),
                ride.getPickupAddress(),
                ride.getDestinationAddress(),
                ride.getPickupLat().doubleValue(),
                ride.getPickupLng().doubleValue(),
                ride.getFareEstimate().getDistanceMeters(),
                offer.getDistanceMeters(),
                ride.getCurrency(),
                ride.getQuotedFareMinor(),
                offer.getExpiresAt());
    }
}
