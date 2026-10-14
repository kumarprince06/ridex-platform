package com.ridex.dispatch;

import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.ridex.dispatch.domain.OfferStatus;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;

import lombok.extern.slf4j.Slf4j;

/**
 * Keeps searching rides moving.
 *
 * <p>Without this a ride nobody accepted sits in SEARCHING forever: the first wave expires and
 * nothing widens the search or tells the rider. The rider stares at a spinner and the ride is
 * never resolved either way.
 *
 * <p>One transaction per ride. A single one for the whole sweep let one bad ride - or one ride
 * another node had already advanced - roll back the expiry and widening of every other ride.
 */
@Slf4j
@Component
public class DispatchSweep {

    // Widen, then give up. Four waves at 3km each reaches well beyond any sensible pickup radius.
    private static final int MAX_WAVES = 4;

    private final RideRequestRepository rideRequestRepository;
    private final RideOfferRepository rideOfferRepository;
    private final DispatchService dispatchService;
    private final OfferNotifier offerNotifier;
    private final TransactionTemplate perRide;

    @Value("${app.dispatch.search-timeout-seconds:180}")
    private long searchTimeoutSeconds;

    @Value("${app.dispatch.sweep-enabled:true}")
    private boolean sweepEnabled;

    public DispatchSweep(RideRequestRepository rideRequestRepository,
            RideOfferRepository rideOfferRepository, DispatchService dispatchService,
            OfferNotifier offerNotifier, PlatformTransactionManager transactionManager) {
        this.rideRequestRepository = rideRequestRepository;
        this.rideOfferRepository = rideOfferRepository;
        this.dispatchService = dispatchService;
        this.offerNotifier = offerNotifier;
        // REQUIRES_NEW: each ride commits or rolls back alone, even if a caller is in a transaction.
        this.perRide = new TransactionTemplate(transactionManager);
        this.perRide.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * The timer entry point. Off in tests, where background work firing inside every integration
     * test races the context shutdown and eventually fails something unrelated.
     */
    @Scheduled(fixedDelayString = "${app.dispatch.sweep-ms:5000}")
    public void scheduledSweep() {
        if (sweepEnabled) {
            sweep();
        }
    }

    public void sweep() {
        Instant now = Instant.now();

        for (String rideId : rideRequestRepository.findSearchingIds(RideStatus.SEARCHING)) {
            try {
                sweepRide(rideId, now);
            } catch (RuntimeException ex) {
                // Its own transaction already rolled back; every other rider still gets their turn.
                log.error("Sweep failed for ride {}", rideId, ex);
            }
        }
    }

    /**
     * Expires one ride's overdue offers and moves its search on, under that ride's row lock.
     *
     * <p>The ride is locked before any offer is touched - the order accept() takes - so the two
     * queue on one row instead of deadlocking across two tables.
     */
    void sweepRide(String rideId, Instant now) {
        perRide.executeWithoutResult(status ->
                rideRequestRepository.lockIfSearching(rideId).ifPresent(ride -> {
                    // Marked before re-offering, or the ride still looks busy.
                    rideOfferRepository.expireOverdue(rideId, now, OfferStatus.OFFERED, OfferStatus.EXPIRED);
                    advance(ride, now);
                }));
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
