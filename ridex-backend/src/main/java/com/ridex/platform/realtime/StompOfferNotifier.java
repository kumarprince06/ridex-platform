package com.ridex.platform.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.ridex.dispatch.OfferNotifier;
import com.ridex.dispatch.dto.OfferResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Pushes offers down the driver's socket.
 *
 * <p>ponytail: no FCM fallback yet, so a backgrounded app misses the offer until it reconnects and
 * calls GET /driver/offers. That is the gap push notifications close, and the reason the reconnect
 * endpoint exists at all.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompOfferNotifier implements OfferNotifier {

    private final SimpMessagingTemplate messaging;

    @Override
    public void offered(String driverId, OfferResponse offer) {
        messaging.convertAndSendToUser(driverId, "/queue/offers", offer);
    }

    /** A payload type, not a Map: the Map overload is ambiguous with the headers one. */
    public record OfferTaken(String event, String rideId, String offerId) {
    }

    @Override
    public void searchGaveUp(String rideId) {
        messaging.convertAndSend("/topic/rides/" + rideId,
                new OfferTaken("SEARCH_EXPIRED", rideId, null));
    }

    @Override
    public void taken(String rideId, String winningOfferId) {
        // Broadcast on the ride, so every driver still counting down stops immediately rather than
        // tapping Accept into a 409.
        messaging.convertAndSend("/topic/rides/" + rideId,
                new OfferTaken("OFFER_TAKEN", rideId, winningOfferId));
    }
}
