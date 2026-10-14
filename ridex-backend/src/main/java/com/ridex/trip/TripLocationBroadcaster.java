package com.ridex.trip;

import java.time.Instant;

import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Pushes the driver's position to the rider following their trip, as it arrives.
 *
 * <p>The rider app used to learn where the car was only by polling the whole ride every few
 * seconds. The send is handed to the broker's outbound pool, so the ping that triggered it does
 * not wait on any rider's socket.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TripLocationBroadcaster {

    static final String TOPIC_PREFIX = "/topic/trips/";

    private final TripRepository tripRepository;
    private final SimpMessagingTemplate messaging;

    /** Sends the position to this driver's trip, if they are on one. Silent when they are not. */
    public void driverMoved(String driverProfileId, double latitude, double longitude) {
        tripRepository.findFirstByDriverIdAndRideRequestStatusInOrderByCreatedAtDesc(
                        driverProfileId, TripService.IN_PROGRESS)
                .ifPresent(trip -> send(trip.getId(), latitude, longitude));
    }

    private void send(String tripId, double latitude, double longitude) {
        try {
            messaging.convertAndSend(topicFor(tripId),
                    new TripLocation(tripId, latitude, longitude, Instant.now()));
        } catch (MessagingException ex) {
            // The position is already in Redis and the rider's poll still reads it. A dropped
            // frame is a marker that moves a few seconds late, not a failed ping.
            log.warn("Could not broadcast the location for trip {}: {}", tripId, ex.getMessage());
        }
    }

    static String topicFor(String tripId) {
        return TOPIC_PREFIX + tripId + "/location";
    }

    /** What the rider's map receives. The server's clock, so riders never see a phone's. */
    public record TripLocation(String tripId, double latitude, double longitude, Instant at) {
    }
}
