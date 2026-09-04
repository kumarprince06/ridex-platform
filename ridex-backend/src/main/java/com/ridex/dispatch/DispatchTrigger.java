package com.ridex.dispatch;

import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Starts the search once the ride is actually committed.
 *
 * <p>Two things this protects against: offering a ride whose row another connection cannot see
 * yet, and a dispatch failure rolling back a booking the rider was already told succeeded.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DispatchTrigger {

    private final DispatchService dispatchService;

    public void afterCommit(String rideId) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            dispatch(rideId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                dispatch(rideId);
            }
        });
    }

    private void dispatch(String rideId) {
        try {
            dispatchService.offerRide(rideId, 1);
        } catch (RuntimeException ex) {
            // ponytail: the ride stays SEARCHING and nothing retries it. A sweep that re-offers
            // rides nobody was assigned to is the missing piece, along with widening waves.
            log.error("Dispatch failed for ride {}", rideId, ex);
        }
    }
}
