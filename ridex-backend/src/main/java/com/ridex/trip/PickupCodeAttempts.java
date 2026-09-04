package com.ridex.trip;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Counts a failed pickup code on its own transaction.
 *
 * <p>A wrong code makes the caller throw, and that rollback would take the increment with it - so
 * the cap would count nothing and the code could be guessed forever. Separate bean because
 * self-invocation skips the proxy and would silently do the same thing.
 */
@Service
@RequiredArgsConstructor
public class PickupCodeAttempts {

    private final TripRepository tripRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(String tripId) {
        tripRepository.findById(tripId).ifPresent(trip -> {
            trip.recordPickupCodeAttempt();
            tripRepository.save(trip);
        });
    }
}
