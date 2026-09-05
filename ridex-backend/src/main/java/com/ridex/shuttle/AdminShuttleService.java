package com.ridex.shuttle;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.driver.DriverEligibility;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shuttle.domain.Route;
import com.ridex.shuttle.domain.RouteFare;
import com.ridex.shuttle.domain.RouteStop;
import com.ridex.shuttle.domain.ShuttleSchedule;
import com.ridex.shuttle.domain.ShuttleTrip;
import com.ridex.shuttle.dto.AdminRouteResponse;
import com.ridex.shuttle.dto.AssignDepartureRequest;
import com.ridex.shuttle.dto.FareRequest;
import com.ridex.shuttle.dto.RouteRequest;
import com.ridex.shuttle.dto.ScheduleRequest;
import com.ridex.shuttle.dto.StopRequest;
import com.ridex.vehicle.DriverVehicleRepository;
import com.ridex.vehicle.domain.DriverVehicle;

import lombok.RequiredArgsConstructor;

/**
 * Building a shuttle route, for operations.
 *
 * <p>Everything hangs off a route on purpose. A stop with no route is not a place, a fare with no
 * stops is a number, and a schedule with no route has nothing to run along - so this is one service
 * with a route id in every method rather than four CRUD surfaces that can disagree.
 */
@Service
@RequiredArgsConstructor
public class AdminShuttleService {

    private final RouteRepository routeRepository;
    private final RouteStopRepository routeStopRepository;
    private final RouteFareRepository routeFareRepository;
    private final ShuttleScheduleRepository shuttleScheduleRepository;
    private final ShuttleTripRepository shuttleTripRepository;
    private final DriverVehicleRepository driverVehicleRepository;
    private final DriverEligibility driverEligibility;

    @Transactional(readOnly = true)
    public List<AdminRouteResponse> routes() {
        return routeRepository.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AdminRouteResponse route(String routeId) {
        return toResponse(requireRoute(routeId));
    }

    @Transactional
    public AdminRouteResponse create(RouteRequest request) {
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (routeRepository.existsByCode(code)) {
            throw new ConflictException("A route with that code already exists.");
        }

        Route route = new Route();
        route.setCode(code);
        route.setName(request.name().trim());
        route.setDescription(blankToNull(request.description()));
        route.setActive(request.active());

        return toResponse(routeRepository.save(route));
    }

    /** The code is not editable: it is printed on tickets and quoted in operations chatter. */
    @Transactional
    public AdminRouteResponse update(String routeId, RouteRequest request) {
        Route route = requireRoute(routeId);
        route.setName(request.name().trim());
        route.setDescription(blankToNull(request.description()));
        route.setActive(request.active());
        return toResponse(routeRepository.save(route));
    }

    /**
     * Appends a stop at the end of the route.
     *
     * <p>Append-only, because a rider can only travel forwards and the sequence is what says so.
     * Inserting in the middle would renumber every stop after it, and the fares are keyed on stop
     * ids that a renumber does not touch - so the fare matrix would quietly describe a different
     * journey. Rebuild the route instead.
     */
    @Transactional
    public AdminRouteResponse addStop(String routeId, StopRequest request) {
        Route route = requireRoute(routeId);
        List<RouteStop> existing = routeStopRepository.findByRouteIdOrderBySequenceAsc(routeId);

        if (!existing.isEmpty()) {
            RouteStop last = existing.get(existing.size() - 1);
            // Time only runs one way along a route. An offset that goes backwards would make the
            // arrival board show a stop arriving before the one before it.
            if (request.offsetMinutes() <= last.getOffsetMinutes()) {
                throw new ValidationException(
                        "This stop must be later than %s, which is %d minutes in."
                                .formatted(last.getName(), last.getOffsetMinutes()));
            }
        }

        RouteStop stop = new RouteStop();
        stop.setRoute(route);
        stop.setSequence((short) (existing.size() + 1));
        stop.setName(request.name().trim());
        stop.setLatitude(request.latitude());
        stop.setLongitude(request.longitude());
        stop.setOffsetMinutes((short) request.offsetMinutes());
        routeStopRepository.save(stop);

        return toResponse(requireRoute(routeId));
    }

    /** Only the last stop, and only when no fare quotes it. Anything else corrupts the matrix. */
    @Transactional
    public AdminRouteResponse removeLastStop(String routeId) {
        List<RouteStop> stops = routeStopRepository.findByRouteIdOrderBySequenceAsc(routeId);
        if (stops.isEmpty()) {
            throw new ConflictException("That route has no stops.");
        }

        RouteStop last = stops.get(stops.size() - 1);
        if (routeFareRepository.existsByFromStopIdOrToStopId(last.getId(), last.getId())) {
            throw new ConflictException(
                    "Remove the fares that quote %s before deleting it.".formatted(last.getName()));
        }

        routeStopRepository.delete(last);
        return toResponse(requireRoute(routeId));
    }

    /** Upsert: the pair is unique, so setting the same leg twice is a correction, not a duplicate. */
    @Transactional
    public AdminRouteResponse setFare(String routeId, FareRequest request) {
        requireRoute(routeId);

        if (request.fromStopId().equals(request.toStopId())) {
            throw new ValidationException("A fare needs two different stops.");
        }

        RouteStop from = requireStopOnRoute(routeId, request.fromStopId());
        RouteStop to = requireStopOnRoute(routeId, request.toStopId());

        // Forwards only. A fare priced backwards would sell a seat for a journey the shuttle does
        // not make.
        if (from.getSequence() >= to.getSequence()) {
            throw new ValidationException("The shuttle travels from %s to %s, not the other way."
                    .formatted(to.getName(), from.getName()));
        }

        RouteFare fare = routeFareRepository
                .findByRouteIdAndFromStopIdAndToStopId(routeId, from.getId(), to.getId())
                .orElseGet(() -> {
                    RouteFare fresh = new RouteFare();
                    fresh.setRouteId(routeId);
                    fresh.setFromStopId(from.getId());
                    fresh.setToStopId(to.getId());
                    return fresh;
                });

        fare.setCurrency(request.currency().toUpperCase(Locale.ROOT));
        fare.setFareMinor(request.fareMinor());
        routeFareRepository.save(fare);

        return toResponse(requireRoute(routeId));
    }

    @Transactional
    public AdminRouteResponse removeFare(String routeId, String fareId) {
        RouteFare fare = routeFareRepository.findById(fareId)
                .orElseThrow(() -> new NotFoundException("No such fare."));
        if (!fare.getRouteId().equals(routeId)) {
            throw new NotFoundException("That fare is not on this route.");
        }
        routeFareRepository.delete(fare);
        return toResponse(requireRoute(routeId));
    }

    @Transactional
    public AdminRouteResponse addSchedule(String routeId, ScheduleRequest request) {
        Route route = requireRoute(routeId);

        if (routeStopRepository.findByRouteIdOrderBySequenceAsc(routeId).size() < 2) {
            throw new ConflictException("Add at least two stops before scheduling departures.");
        }

        ShuttleSchedule schedule = new ShuttleSchedule();
        schedule.setRoute(route);
        schedule.setDepartureTime(request.departureTime());
        schedule.setDaysOfWeek(request.daysOfWeek() == null ? "1,2,3,4,5" : request.daysOfWeek());
        schedule.setSeatCapacity((short) request.seatCapacity());
        schedule.setSeatsPerRow((short) request.seatsPerRow());
        schedule.setActive(request.active());
        shuttleScheduleRepository.save(schedule);

        return toResponse(requireRoute(routeId));
    }

    /**
     * Capacity and layout changes apply to future departures only.
     *
     * <p>A materialised trip keeps the capacity it was created with: seats on it are already sold,
     * and shrinking it would oversell a bus that is running tomorrow morning.
     */
    @Transactional
    public AdminRouteResponse updateSchedule(String routeId, String scheduleId,
            ScheduleRequest request) {
        ShuttleSchedule schedule = shuttleScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new NotFoundException("No such schedule."));
        if (!schedule.getRoute().getId().equals(routeId)) {
            throw new NotFoundException("That schedule is not on this route.");
        }

        schedule.setDepartureTime(request.departureTime());
        schedule.setDaysOfWeek(request.daysOfWeek() == null ? schedule.getDaysOfWeek() : request.daysOfWeek());
        schedule.setSeatCapacity((short) request.seatCapacity());
        schedule.setSeatsPerRow((short) request.seatsPerRow());
        schedule.setActive(request.active());
        shuttleScheduleRepository.save(schedule);

        return toResponse(requireRoute(routeId));
    }

    /**
     * Puts a driver and a vehicle on one departure.
     *
     * <p>The columns have existed since V17 and nothing has ever written them, so every shuttle
     * seat sold so far has been on a bus with nobody driving it.
     */
    @Transactional
    public void assignDeparture(String scheduleId, LocalDate serviceDate,
            AssignDepartureRequest request) {
        ShuttleTrip trip = shuttleTripRepository
                .findByScheduleIdAndServiceDate(scheduleId, serviceDate)
                .orElseThrow(() -> new NotFoundException(
                        "That departure does not exist yet. It is created when the first seat sells."));

        String blocked = driverEligibility.blockedReason(request.driverId());
        if (blocked != null) {
            throw new ConflictException(blocked);
        }

        DriverVehicle vehicle = driverVehicleRepository.findById(request.vehicleId())
                .orElseThrow(() -> new NotFoundException("No such vehicle."));

        if (!vehicle.getDriver().getId().equals(request.driverId())) {
            throw new ValidationException("That vehicle belongs to another driver.");
        }
        // The seats were sold against the schedule's capacity. A smaller vehicle means somebody
        // who paid does not get on.
        if (vehicle.getSeatCapacity() < trip.getSeatCapacity()) {
            throw new ValidationException("That vehicle seats %d, and %d seats are scheduled."
                    .formatted(vehicle.getSeatCapacity(), trip.getSeatCapacity()));
        }

        trip.setDriverId(request.driverId());
        trip.setVehicleId(vehicle.getId());
        shuttleTripRepository.save(trip);
    }

    private Route requireRoute(String routeId) {
        return routeRepository.findById(routeId)
                .orElseThrow(() -> new NotFoundException("No such route."));
    }

    private RouteStop requireStopOnRoute(String routeId, String stopId) {
        return routeStopRepository.findByRouteIdOrderBySequenceAsc(routeId).stream()
                .filter(stop -> stop.getId().equals(stopId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("That stop is not on this route."));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private AdminRouteResponse toResponse(Route route) {
        List<AdminRouteResponse.Stop> stops =
                routeStopRepository.findByRouteIdOrderBySequenceAsc(route.getId()).stream()
                        .map(stop -> new AdminRouteResponse.Stop(
                                stop.getId(),
                                stop.getSequence(),
                                stop.getName(),
                                stop.getLatitude().toPlainString(),
                                stop.getLongitude().toPlainString(),
                                stop.getOffsetMinutes()))
                        .toList();

        List<AdminRouteResponse.Fare> fares = routeFareRepository.findByRouteId(route.getId()).stream()
                .map(fare -> new AdminRouteResponse.Fare(
                        fare.getId(), fare.getFromStopId(), fare.getToStopId(),
                        fare.getCurrency(), fare.getFareMinor()))
                .toList();

        List<AdminRouteResponse.Schedule> schedules =
                shuttleScheduleRepository.findByRouteIdOrderByDepartureTimeAsc(route.getId()).stream()
                        .map(schedule -> new AdminRouteResponse.Schedule(
                                schedule.getId(),
                                schedule.getDepartureTime(),
                                schedule.getDaysOfWeek(),
                                schedule.getSeatCapacity(),
                                schedule.getSeatsPerRow(),
                                schedule.isActive()))
                        .toList();

        return new AdminRouteResponse(
                route.getId(), route.getCode(), route.getName(), route.getDescription(),
                route.isActive(), stops, fares, schedules);
    }
}
