package com.ridex.shuttle;

import org.springframework.stereotype.Component;

import com.ridex.platform.realtime.SubscriptionGuard;

import lombok.RequiredArgsConstructor;

/** Only a departure's own riders and driver can follow it live. */
@Component
@RequiredArgsConstructor
public class ShuttleTopicGuard implements SubscriptionGuard {

    static final String PREFIX = "/topic/shuttle-trips/";

    private final ShuttleRunService shuttleRunService;

    @Override
    public Boolean allows(String userId, String destination) {
        if (destination == null || !destination.startsWith(PREFIX)) {
            return null;
        }
        return shuttleRunService.canWatch(userId, destination.substring(PREFIX.length()));
    }
}
