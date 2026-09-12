package com.ridex.shuttle;

import java.time.Duration;
import java.time.Instant;

import org.springframework.stereotype.Component;

import com.ridex.driver.DriverCard;
import com.ridex.location.DriverPresence;
import com.ridex.shuttle.dto.CrewResponse;

import lombok.RequiredArgsConstructor;

/** Turns the driver and vehicle ids carried on a schedule or a trip into something a rider reads. */
@Component
@RequiredArgsConstructor
public class ShuttleCrew {

    /**
     * How long before departure a rider may watch the vehicle.
     *
     * <p>Earlier than this the shuttle is on another run or parked, and showing it only tells the
     * rider something that is not about their journey.
     */
    private static final Duration TRACKABLE_BEFORE_DEPARTURE = Duration.ofMinutes(15);

    private final DriverCard driverCard;
    private final DriverPresence driverPresence;

    /** Null when the departure has no crew yet - the app hides the card rather than showing blanks. */
    public CrewResponse of(String driverId, String vehicleId) {
        return of(driverId, vehicleId, null);
    }

    /** The same card, with the vehicle's position once the departure is close enough to watch. */
    public CrewResponse of(String driverId, String vehicleId, Instant departsAt) {
        DriverCard.Card card = driverCard.of(driverId, vehicleId);
        if (card == null) {
            return null;
        }

        var position = trackable(departsAt)
                ? driverPresence.positionOf(driverId)
                : java.util.Optional.<DriverPresence.Position>empty();

        return new CrewResponse(card.name(), card.phone(), card.rating(), card.vehicle(),
                card.registrationNumber(), card.seatCapacity(),
                position.map(DriverPresence.Position::latitude).orElse(null),
                position.map(DriverPresence.Position::longitude).orElse(null));
    }

    private boolean trackable(Instant departsAt) {
        return departsAt != null
                && !Instant.now().isBefore(departsAt.minus(TRACKABLE_BEFORE_DEPARTURE));
    }
}
