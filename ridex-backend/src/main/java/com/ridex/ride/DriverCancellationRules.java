package com.ridex.ride;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.ridex.platform.settings.SettingsService;
import com.ridex.ride.domain.CancellationReason;
import com.ridex.ride.domain.RideRequest;

import lombok.RequiredArgsConstructor;

/**
 * What a driver's cancellation costs them. The same answer drives the quote the Cancel screen
 * shows and the charge the cancel posts, so the app can never promise a free cancel it isn't.
 */
@Component
@RequiredArgsConstructor
public class DriverCancellationRules {

    private static final Set<CancellationReason> NO_SHOW =
            EnumSet.of(CancellationReason.RIDER_NOT_AT_PICKUP, CancellationReason.RIDER_UNREACHABLE);

    private final SettingsService settings;

    /** penaltyMinor is taken from the driver; riderNoShow means the rider pays the no-show fee. */
    public record Charge(long penaltyMinor, boolean riderNoShow, String note) {
    }

    public Charge chargeFor(RideRequest ride, Instant arrivedAt, CancellationReason reason, Instant now) {
        if (reason == CancellationReason.UNSAFE_SITUATION) {
            return new Charge(0, false, "No charge. Safety comes first, and operations will review it.");
        }

        // Server-checked: a no-show is only free once the driver has marked arrival and waited.
        long wait = settings.getInt("driver.no-show.wait-seconds", 300);
        boolean noShowClaim = NO_SHOW.contains(reason);
        long waited = arrivedAt == null ? -1 : Duration.between(arrivedAt, now).toSeconds();
        if (noShowClaim && waited >= wait) {
            return new Charge(0, true, "No charge. You waited, so the rider pays the no-show fee.");
        }

        long grace = settings.getInt("driver.cancel.grace-seconds", 60);
        if (ride.getAssignedAt() != null && ride.getAssignedAt().plusSeconds(grace).isAfter(now)) {
            return new Charge(0, false, "Free - you are still inside the window after accepting.");
        }

        long penalty = settings.getInt("driver.cancel.penalty", 20) * 100L;
        String note = !noShowClaim ? "Taken from your wallet."
                : arrivedAt == null ? "Swipe that you have arrived and wait " + minutes(wait) + " to cancel a no-show for free."
                : "Wait " + minutes(wait - waited) + " more at the pickup to cancel for free.";
        return new Charge(penalty, false, note);
    }

    private static String minutes(long seconds) {
        long whole = Math.max(1, (seconds + 59) / 60);
        return whole + (whole == 1 ? " minute" : " minutes");
    }
}
