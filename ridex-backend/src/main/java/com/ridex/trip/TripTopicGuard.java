package com.ridex.trip;

import org.springframework.stereotype.Component;

import com.ridex.platform.realtime.SubscriptionGuard;

import lombok.RequiredArgsConstructor;

/** Only a trip's own rider and driver can follow where its car is. */
@Component
@RequiredArgsConstructor
public class TripTopicGuard implements SubscriptionGuard {

    private final TripService tripService;

    @Override
    public Boolean allows(String userId, String destination) {
        if (destination == null || !destination.startsWith(TripLocationBroadcaster.TOPIC_PREFIX)) {
            return null;
        }
        // Everything under the prefix is guarded, not just /location: a new trip topic added
        // later is private by default rather than public by omission.
        String rest = destination.substring(TripLocationBroadcaster.TOPIC_PREFIX.length());
        int slash = rest.indexOf('/');
        String tripId = slash < 0 ? rest : rest.substring(0, slash);
        return !tripId.isBlank() && tripService.canWatch(userId, tripId);
    }
}
