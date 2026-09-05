package com.ridex.shuttle;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.driver.DriverProfileRepository;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ForbiddenException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shuttle.domain.RouteStop;
import com.ridex.shuttle.domain.ShuttleBooking;
import com.ridex.shuttle.domain.ShuttleTrip;
import com.ridex.shuttle.dto.ManifestResponse;

import lombok.RequiredArgsConstructor;

/**
 * The driver's side of a shuttle departure.
 *
 * <p>Everything here is scoped to the trip the driver is assigned to. A manifest names passengers
 * and where they get off, which is exactly the sort of list that must not be readable by whoever
 * guesses a trip id.
 */
@Service
@RequiredArgsConstructor
public class DriverShuttleService {

    private final ShuttleTripRepository shuttleTripRepository;
    private final ShuttleBookingRepository bookingRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final RouteStopRepository routeStopRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<ManifestResponse> departures(String driverUserId, LocalDate serviceDate) {
        String driverId = requireDriverId(driverUserId);
        return shuttleTripRepository
                .findByDriverIdAndServiceDateOrderByDepartsAtAsc(driverId, serviceDate)
                .stream().map(this::manifest).toList();
    }

    @Transactional(readOnly = true)
    public ManifestResponse manifest(String driverUserId, String shuttleTripId) {
        return manifest(requireOwnTrip(driverUserId, shuttleTripId));
    }

    /**
     * Checks a passenger in against the code they show.
     *
     * <p>The code is compared, never displayed: only its hash is stored, and a driver who could
     * read it could board an empty seat and sell it at the door.
     */
    @Transactional
    public ManifestResponse board(String driverUserId, String shuttleTripId, String bookingId,
            String boardingCode) {
        ShuttleTrip trip = requireOwnTrip(driverUserId, shuttleTripId);

        ShuttleBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("No such booking."));

        if (!booking.getShuttleTrip().getId().equals(trip.getId())) {
            throw new NotFoundException("That booking is not on this departure.");
        }
        if ("CANCELLED".equals(booking.getStatus())) {
            throw new ConflictException("That seat was cancelled.");
        }
        if (booking.getBoardedAt() != null) {
            // Not an error worth blocking on, but worth saying: a second scan of the same ticket
            // is how one code gets used by two people.
            throw new ConflictException("That passenger is already on board.");
        }
        if (!passwordEncoder.matches(boardingCode, booking.getBoardingCodeHash())) {
            throw new ValidationException("That code does not match this seat.");
        }

        booking.setBoardedAt(Instant.now());
        bookingRepository.save(booking);

        return manifest(trip);
    }

    private ManifestResponse manifest(ShuttleTrip trip) {
        String routeId = trip.getSchedule().getRoute().getId();
        List<RouteStop> stops = routeStopRepository.findByRouteIdOrderBySequenceAsc(routeId);
        Map<String, RouteStop> byId = stops.stream()
                .collect(Collectors.toMap(RouteStop::getId, Function.identity()));

        List<ShuttleBooking> bookings = bookingRepository.manifestFor(trip.getId());

        Map<String, List<ShuttleBooking>> boardingAt = bookings.stream()
                .collect(Collectors.groupingBy(ShuttleBooking::getBoardingStopId));
        Map<String, List<ShuttleBooking>> alightingAt = bookings.stream()
                .collect(Collectors.groupingBy(ShuttleBooking::getAlightingStopId));

        List<ManifestResponse.StopManifest> perStop = new ArrayList<>(stops.size());
        int onBoard = 0;

        for (RouteStop stop : stops) {
            List<ShuttleBooking> boarding = boardingAt.getOrDefault(stop.getId(), List.of());
            List<ShuttleBooking> alighting = alightingAt.getOrDefault(stop.getId(), List.of());

            // Off before on, as it happens at the door - and as the running total must be counted,
            // or a full shuttle looks oversold at the stop where half of it gets out.
            onBoard = onBoard - alighting.size() + boarding.size();

            perStop.add(new ManifestResponse.StopManifest(
                    stop.getId(),
                    stop.getSequence(),
                    stop.getName(),
                    stop.getOffsetMinutes(),
                    boarding.size(),
                    alighting.size(),
                    onBoard,
                    boarding.stream().map(booking -> passenger(booking, byId)).toList(),
                    alighting.stream().map(booking -> passenger(booking, byId)).toList()));
        }

        return new ManifestResponse(
                trip.getId(),
                trip.getSchedule().getRoute().getName(),
                trip.getDepartsAt(),
                trip.getSeatCapacity(),
                bookings.size(),
                perStop);
    }

    private ManifestResponse.Passenger passenger(ShuttleBooking booking, Map<String, RouteStop> stops) {
        var user = booking.getRider().getUser();
        String name = java.util.stream.Stream.of(user.getFirstName(), user.getLastName())
                .filter(part -> part != null && !part.isBlank())
                .collect(Collectors.joining(" "));

        return new ManifestResponse.Passenger(
                booking.getId(),
                booking.getSeatLabel(),
                // Falls back to the seat rather than the email: a driver reading a list aloud at
                // the door does not need a passenger's address, and docs/14 keeps it off this list.
                name.isBlank() ? "Seat " + booking.getSeatLabel() : name,
                stops.containsKey(booking.getAlightingStopId())
                        ? stops.get(booking.getAlightingStopId()).getName()
                        : "Unknown stop",
                booking.getBoardedAt() != null);
    }

    private ShuttleTrip requireOwnTrip(String driverUserId, String shuttleTripId) {
        String driverId = requireDriverId(driverUserId);
        ShuttleTrip trip = shuttleTripRepository.findById(shuttleTripId)
                .orElseThrow(() -> new NotFoundException("No such departure."));

        if (!driverId.equals(trip.getDriverId())) {
            throw new ForbiddenException("You are not driving that departure.");
        }
        return trip;
    }

    private String requireDriverId(String driverUserId) {
        return driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."))
                .getId();
    }
}
