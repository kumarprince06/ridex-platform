package com.ridex.dispatch;

import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.dispatch.domain.OfferStatus;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Keeps searching rides moving.
 *
 * <p>Without this a ride nobody accepted sits in SEARCHING forever: the first wave expires and
 * nothing widens the search or tells the rider. The rider stares at a spinner and the ride is
 * never resolved either way.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DispatchSweep {

    // Widen, then give up. Four waves at 3km each reaches well beyond any sensible pickup radius.
    private static final int MAX_WAVES = 4;

    private final RideRequestRepository rideRequestRepository;
    private final RideOfferRepository rideOfferRepository;
    private final DispatchService dispatchService;
    private final OfferNotifier offerNotifier;

    @Value("${app.dispatch.search-timeout-seconds:180}")
    private long searchTimeoutSeconds;

    @Value("${app.dispatch.sweep-enabled:true}")
    private boolean sweepEnabled;

    /**
     * The timer entry point. Off in tests, where background work firing inside every integration
     * test races the context shutdown and eventually fails something unrelated.
     *
     * <p>Transactional here as well as on sweep(): calling sweep() from inside this class goes
     * straight to the method and never through the proxy, so without this the scheduled run had
     * no transaction at all and every modifying query in it failed.
     */
    @Scheduled(fixedDelayString = "${app.dispatch.sweep-ms:5000}")
    @Transactional
    public void scheduledSweep() {
        if (sweepEnabled) {
            sweep();
        }
    }

    @Transactional
    public void sweep() {
        Instant now = Instant.now();

        // Offers whose countdown ran out. Marked before re-offering, or the ride still looks busy.
        rideOfferRepository.expireOverdue(now, OfferStatus.OFFERED, OfferStatus.EXPIRED);

        for (RideRequest ride : rideRequestRepository.findSearching(RideStatus.SEARCHING)) {
            try {
                advance(ride, now);
            } catch (RuntimeException ex) {
                // One bad ride must not stop the sweep for every other rider waiting.
                log.error("Sweep failed for ride {}", ride.getId(), ex);
            }
        }
    }

    private void advance(RideRequest ride, Instant now) {
        // Somebody is still counting down. Leave them to it.
        if (rideOfferRepository.countLive(ride.getId(), now, OfferStatus.OFFERED) > 0) {
            return;
        }

        boolean outOfTime = ride.getRequestedAt()
                .plus(Duration.ofSeconds(searchTimeoutSeconds)).isBefore(now);
        int nextWave = ride.getSearchWave() + 1;

        if (outOfTime || nextWave > MAX_WAVES) {
            // A ride that ends as EXPIRED is a ride the rider can be told about and refunded if
            // anything was held. One that stays SEARCHING is a support ticket.
            ride.transitionTo(RideStatus.EXPIRED);
            rideRequestRepository.save(ride);
            offerNotifier.searchGaveUp(ride.getId());
            log.info("Ride {} expired after {} waves", ride.getId(), nextWave - 1);
            return;
        }

        // Recorded before offering: a wave that reaches nobody still counts as tried, or the
        // search never widens past the drivers it already asked.
        ride.setSearchWave((short) nextWave);
        rideRequestRepository.save(ride);

        // Wider radius each time: the nearest drivers had their chance.
        dispatchService.offerRide(ride.getId(), nextWave);
    }
}
