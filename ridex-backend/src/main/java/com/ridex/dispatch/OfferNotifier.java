package com.ridex.dispatch;

import com.ridex.dispatch.dto.OfferResponse;

/**
 * How an offer reaches a driver's phone.
 *
 * <p>Delivery is a push; the claim stays HTTP. A socket message has no natural 409 and no retry
 * semantics, so the socket delivers and the database decides.
 */
public interface OfferNotifier {

    void offered(String driverId, OfferResponse offer);

    /** Tells the losers the moment somebody wins, rather than leaving them on a dead countdown. */
    void taken(String rideId, String winningOfferId);

    /** Tells the rider nobody took it, rather than leaving a spinner running forever. */
    void searchGaveUp(String rideId);
}
