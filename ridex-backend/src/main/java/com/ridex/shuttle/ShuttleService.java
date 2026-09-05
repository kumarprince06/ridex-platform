package com.ridex.shuttle;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.notification.DeliveryChannel;
import com.ridex.notification.Notifier;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shared.util.OtpGenerator;
import com.ridex.shared.util.UlidGenerator;
import com.ridex.shuttle.domain.*;
import com.ridex.shuttle.dto.*;

import lombok.RequiredArgsConstructor;

/**
 * Shuttle booking: a chosen seat on a scheduled departure.
 *
 * <p>Seat inventory, not dispatch. Nobody is searching for a driver - the vehicle is already going,
 * and the only question is whether 4A is free.
 */
@Service
@RequiredArgsConstructor
public class ShuttleService {

    private final RouteRepository routeRepository;
    private final ShuttleScheduleRepository scheduleRepository;
    private final ShuttleTripRepository shuttleTripRepository;
    private final ShuttleBookingRepository bookingRepository;
    private final RouteFareRepository routeFareRepository;
    private final PassRepository passRepository;
    private final Notifier notifier;
    private final RiderProfileRepository riderProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<Route> routes() {
        return routeRepository.findByActiveTrueOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public List<ShuttleSchedule> schedulesFor(String routeId) {
        return scheduleRepository.findByRouteIdAndActiveTrueOrderByDepartureTimeAsc(routeId);
    }

    /**
     * The seat picker, for the leg the rider is actually travelling.
     *
     * <p>Availability is per leg, not per departure. A seat sold from stop 1 to stop 2 is free
     * again from stop 2 onwards - treating it as gone for the whole run empties the far end of a
     * commuter route while telling people it is full.
     *
     * <p>With no leg given it falls back to the whole route, which is the honest answer to "what
     * is free on this bus" and the wrong one to show somebody booking two stops of it.
     */
    @Transactional
    public SeatMapResponse seatMap(String scheduleId, LocalDate serviceDate,
            String boardingStopId, String alightingStopId) {
        ShuttleTrip trip = departureFor(scheduleId, serviceDate);

        short fromSeq = 1;
        short toSeq = Short.MAX_VALUE;
        if (boardingStopId != null && alightingStopId != null) {
            RouteStop boarding = stopOn(trip, boardingStopId);
            RouteStop alighting = stopOn(trip, alightingStopId);
            if (boarding.getSequence() >= alighting.getSequence()) {
                throw new ValidationException("Choose a stop further along the route to get off at.");
            }
            fromSeq = boarding.getSequence();
            toSeq = alighting.getSequence();
        }

        Set<String> taken = Set.copyOf(
                bookingRepository.takenSeatsOverLeg(trip.getId(), fromSeq, toSeq));

        List<SeatMapResponse.SeatResponse> seats =
                SeatMap.labelsFor(trip.getSeatCapacity(), trip.getSeatsPerRow()).stream()
                .map(label -> new SeatMapResponse.SeatResponse(label, !taken.contains(label)))
                .toList();

        return new SeatMapResponse(
                trip.getId(),
                trip.getSchedule().getRoute().getName(),
                trip.getDepartsAt(),
                trip.getSeatCapacity(),
                trip.getSeatsPerRow(),
                SeatMap.aisleAfter(trip.getSeatsPerRow()),
                seats,
                trip.getSeatCapacity() - taken.size());
    }

    /**
     * Books one seat.
     *
     * <p>A live pass covers the fare if the rider holds one for this route. Otherwise the published
     * stop-pair fare applies - fixed, because a commute somebody takes twice a day cannot surge.
     */
    @Transactional
    public ShuttleBookingResponse book(String riderUserId, BookSeatRequest request) {
        RiderProfile rider = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));

        LocalDate serviceDate = LocalDate.parse(request.serviceDate());
        ShuttleTrip trip = departureFor(request.scheduleId(), serviceDate);

        if (trip.getDepartsAt().isBefore(Instant.now())) {
            throw new ConflictException("That departure has already left.");
        }
        if (!SeatMap.isValid(request.seatLabel(), trip.getSeatCapacity(), trip.getSeatsPerRow())) {
            throw new ValidationException("There is no seat " + request.seatLabel() + " on this shuttle.");
        }

        RouteStop boarding = stopOn(trip, request.boardingStopId());
        RouteStop alighting = stopOn(trip, request.alightingStopId());
        if (boarding.getSequence() >= alighting.getSequence()) {
            // The route runs one way. Boarding after your destination is not a shorter trip.
            throw new ValidationException("Choose a stop further along the route to get off at.");
        }

        String routeId = trip.getSchedule().getRoute().getId();
        Pass pass = passRepository.findLive(rider.getId(), routeId, serviceDate).stream()
                .filter(candidate -> candidate.coversOn(serviceDate, routeId))
                .findFirst()
                .orElse(null);

        long fare = pass != null ? 0 : fareBetween(routeId, boarding, alighting);
        String boardingCode = OtpGenerator.generate();

        ShuttleBooking booking = new ShuttleBooking();
        booking.setShuttleTrip(trip);
        booking.setRider(rider);
        booking.setSeatLabel(request.seatLabel());
        booking.setBoardingStopId(boarding.getId());
        booking.setAlightingStopId(alighting.getId());
        booking.setBoardingSeq(boarding.getSequence());
        booking.setAlightingSeq(alighting.getSequence());
        booking.setCurrency(currencyFor(routeId, boarding, alighting));
        booking.setFareMinor(fare);
        booking.setPassId(pass == null ? null : pass.getId());
        // One secret, shown as digits and encoded in a QR - the same rule as an on-demand pickup.
        booking.setBoardingCodeHash(passwordEncoder.encode(boardingCode));

        try {
            bookingRepository.saveAndFlush(booking);
        } catch (DataIntegrityViolationException ex) {
            // The gist exclusion constraint is what actually decides this. Two riders tapping 4A
            // for overlapping legs at the same instant both pass an availability check; only one
            // survives the insert.
            throw new ConflictException("That seat has just been taken. Please pick another.");
        }

        if (pass != null) {
            // Counted up rather than down: a used count reconciles against the bookings.
            pass.setRidesUsed((short) (pass.getRidesUsed() + 1));
            passRepository.save(pass);
        }

        notifier.enqueue(DeliveryChannel.PUSH, rider.getUser().getId(), "SHUTTLE_BOOKED",
                request.seatLabel());

        return toResponse(booking, boarding, alighting, boardingCode);
    }

    @Transactional
    public void cancel(String riderUserId, String bookingId) {
        RiderProfile rider = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));

        ShuttleBooking booking = bookingRepository.findOwn(bookingId, rider.getId())
                .orElseThrow(() -> new NotFoundException("No such booking."));

        if (!"BOOKED".equals(booking.getStatus())) {
            throw new ConflictException("That booking is already cancelled.");
        }

        booking.setStatus("CANCELLED");
        booking.setCancelledAt(Instant.now());
        bookingRepository.save(booking);

        // The seat goes back into the pool, and a pass ride is handed back with it.
        if (booking.getPassId() != null) {
            passRepository.findById(booking.getPassId()).ifPresent(pass -> {
                pass.setRidesUsed((short) Math.max(0, pass.getRidesUsed() - 1));
                passRepository.save(pass);
            });
        }
    }

    @Transactional(readOnly = true)
    public List<ShuttleBooking> myBookings(String riderUserId) {
        return riderProfileRepository.findByUserId(riderUserId)
                .map(rider -> bookingRepository.findByRiderIdOrderByCreatedAtDesc(rider.getId()))
                .orElse(List.of());
    }

    /** Materialised on first use, so an unbooked route does not fill the table with empty days. */
    private ShuttleTrip departureFor(String scheduleId, LocalDate serviceDate) {
        ShuttleSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new NotFoundException("No such departure."));

        if (!schedule.runsOn(serviceDate.getDayOfWeek())) {
            throw new ValidationException("This shuttle does not run on that day.");
        }

        return shuttleTripRepository.findByScheduleIdAndServiceDate(scheduleId, serviceDate)
                .orElseGet(() -> createDeparture(schedule, serviceDate));
    }

    /**
     * Find-or-create, which is a race: two riders booking the first seat on a departure both find
     * nothing and both insert. uk_shuttle_trips_departure decides it, and the loser reads the row
     * the winner just wrote rather than failing a booking over bookkeeping.
     */
    private ShuttleTrip createDeparture(ShuttleSchedule schedule, LocalDate serviceDate) {
        shuttleTripRepository.insertIfAbsent(
                UlidGenerator.generateUlid(),
                schedule.getId(),
                serviceDate,
                serviceDate.atTime(schedule.getDepartureTime()).toInstant(ZoneOffset.UTC),
                schedule.getSeatCapacity(),
                schedule.getSeatsPerRow());

        // Re-read rather than trusting the insert: whether this call created the row or found it
        // already there, the row is the same one and its id came from whoever won.
        return shuttleTripRepository.findByScheduleIdAndServiceDate(schedule.getId(), serviceDate)
                .orElseThrow(() -> new ConflictException("That departure could not be opened."));
    }

    private RouteStop stopOn(ShuttleTrip trip, String stopId) {
        return trip.getSchedule().getRoute().getStops().stream()
                .filter(stop -> stop.getId().equals(stopId))
                .findFirst()
                .orElseThrow(() -> new ValidationException("That stop is not on this route."));
    }

    private long fareBetween(String routeId, RouteStop from, RouteStop to) {
        return routeFareRepository
                .findByRouteIdAndFromStopIdAndToStopId(routeId, from.getId(), to.getId())
                .map(RouteFare::getFareMinor)
                .orElseThrow(() -> new ConflictException(
                        "No fare is published between those stops yet."));
    }

    private String currencyFor(String routeId, RouteStop from, RouteStop to) {
        return routeFareRepository
                .findByRouteIdAndFromStopIdAndToStopId(routeId, from.getId(), to.getId())
                .map(RouteFare::getCurrency)
                .orElse("INR");
    }

    private ShuttleBookingResponse toResponse(ShuttleBooking booking, RouteStop boarding,
            RouteStop alighting, String boardingCode) {
        return new ShuttleBookingResponse(
                booking.getId(),
                booking.getShuttleTrip().getSchedule().getRoute().getName(),
                booking.getSeatLabel(),
                boarding.getName(),
                alighting.getName(),
                booking.getShuttleTrip().getDepartsAt(),
                booking.getCurrency(),
                booking.getFareMinor(),
                booking.getPassId(),
                booking.getStatus(),
                boardingCode);
    }
}
