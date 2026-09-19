package com.ridex.shuttle;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.ridex.driver.DriverProfileRepository;
import com.ridex.location.DriverPresence;
import com.ridex.notification.Notifier;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ForbiddenException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shuttle.domain.RouteStop;
import com.ridex.shuttle.domain.ShuttleBooking;
import com.ridex.shuttle.domain.ShuttleStopEvent;
import com.ridex.shuttle.domain.ShuttleTrip;
import com.ridex.shuttle.dto.BookingLiveResponse;
import com.ridex.shuttle.dto.ShuttleLiveResponse;

import lombok.RequiredArgsConstructor;

/**
 * A shuttle departure while it runs: start, stops reached, finish, and the live state riders see.
 */
@Service
@RequiredArgsConstructor
public class ShuttleRunService {

    // Close enough to call it "at the stop". Wide enough for GPS drift, tight enough for city stops.
    static final double ARRIVAL_RADIUS_METRES = 100;
    private static final Duration EARLIEST_START = Duration.ofMinutes(30);

    private final ShuttleTripRepository tripRepository;
    private final RouteStopRepository stopRepository;
    private final ShuttleStopEventRepository eventRepository;
    private final ShuttleBookingRepository bookingRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final ShuttleLiveStore liveStore;
    private final SimpMessagingTemplate messaging;
    private final Notifier notifier;

    @Transactional
    public ShuttleLiveResponse start(String driverUserId, String tripId) {
        ShuttleTrip trip = requireOwnTrip(driverUserId, tripId);
        if (!"SCHEDULED".equals(trip.getStatus())) {
            throw new ConflictException("This run has already been started.");
        }
        Instant now = Instant.now();
        if (now.isBefore(trip.getDepartsAt().minus(EARLIEST_START))) {
            throw new ConflictException("You can start this run from "
                    + DateTimeFormatter.ofPattern("h:mm a").withZone(ZoneId.systemDefault())
                            .format(trip.getDepartsAt().minus(EARLIEST_START)) + ".");
        }
        trip.setStatus("RUNNING");
        trip.setStartedAt(now);
        tripRepository.save(trip);

        String routeName = trip.getSchedule().getRoute().getName();
        bookingRepository.manifestFor(trip.getId()).forEach(booking ->
                notifyRider(booking, "SHUTTLE_STARTED", routeName));
        return publish(trip, "STARTED");
    }

    /** A GPS ping from the driver. Reaching the next stop is decided here, not on the phone. */
    @Transactional
    public ShuttleLiveResponse reportPosition(String driverUserId, String tripId,
            double latitude, double longitude, Double heading) {
        ShuttleTrip trip = requireRunning(requireOwnTrip(driverUserId, tripId));
        liveStore.save(tripId, latitude, longitude, heading);

        RouteStop next = nextStop(trip, stopsOf(trip));
        if (next != null && new DriverPresence.Position(latitude, longitude)
                .metresTo(next.getLatitude().doubleValue(), next.getLongitude().doubleValue()) <= ARRIVAL_RADIUS_METRES) {
            reach(trip, next, "AUTO");
            return publish(trip, "STOP_REACHED");
        }
        return liveStore.claimBroadcast(tripId) ? publish(trip, "POSITION") : stateOf(trip, "POSITION");
    }

    /** The driver's backup for when GPS misses a stop. Can skip ahead, never go back. */
    @Transactional
    public ShuttleLiveResponse arrive(String driverUserId, String tripId, String stopId) {
        ShuttleTrip trip = requireRunning(requireOwnTrip(driverUserId, tripId));
        RouteStop stop = stopsOf(trip).stream().filter(candidate -> candidate.getId().equals(stopId))
                .findFirst().orElseThrow(() -> new NotFoundException("That stop is not on this route."));
        if (trip.getCurrentStopSeq() != null && stop.getSequence() <= trip.getCurrentStopSeq()) {
            throw new ConflictException("That stop has already been reached.");
        }
        reach(trip, stop, "DRIVER");
        return publish(trip, "STOP_REACHED");
    }

    @Transactional
    public ShuttleLiveResponse finish(String driverUserId, String tripId) {
        ShuttleTrip trip = requireRunning(requireOwnTrip(driverUserId, tripId));
        trip.setStatus("COMPLETED");
        trip.setCompletedAt(Instant.now());
        tripRepository.save(trip);
        liveStore.clear(tripId);
        return publish(trip, "FINISHED");
    }

    @Transactional(readOnly = true)
    public ShuttleLiveResponse forDriver(String driverUserId, String tripId) {
        return stateOf(requireOwnTrip(driverUserId, tripId), "SNAPSHOT");
    }

    @Transactional(readOnly = true)
    public BookingLiveResponse forRider(String riderUserId, String bookingId) {
        String riderId = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."))
                .getId();
        ShuttleBooking booking = bookingRepository.findOwn(bookingId, riderId)
                .orElseThrow(() -> new NotFoundException("No such booking."));
        return new BookingLiveResponse(stateOf(booking.getShuttleTrip(), "SNAPSHOT"),
                booking.getBoardingSeq(), booking.getAlightingSeq());
    }

    /** Who may subscribe to a departure's live channel: its riders and its driver. */
    @Transactional(readOnly = true)
    public boolean canWatch(String userId, String tripId) {
        if (bookingRepository.isRiderOn(tripId, userId)) {
            return true;
        }
        return tripRepository.findById(tripId)
                .flatMap(trip -> driverProfileRepository.findByUserId(userId)
                        .map(driver -> driver.getId().equals(trip.getDriverId())))
                .orElse(false);
    }

    private void reach(ShuttleTrip trip, RouteStop stop, String source) {
        // The unique key on (trip, sequence) makes this once-only even if two pings race.
        if (eventRepository.existsByShuttleTripIdAndSequence(trip.getId(), stop.getSequence())) {
            return;
        }
        ShuttleStopEvent event = new ShuttleStopEvent();
        event.setShuttleTripId(trip.getId());
        event.setStopId(stop.getId());
        event.setSequence(stop.getSequence());
        event.setArrivedAt(Instant.now());
        event.setSource(source);
        eventRepository.saveAndFlush(event);

        trip.setCurrentStopSeq(stop.getSequence());
        tripRepository.save(trip);

        // Alerts ride on the stop event, so each goes out once per booking.
        Map<Short, RouteStop> bySequence = stopsOf(trip).stream()
                .collect(Collectors.toMap(RouteStop::getSequence, Function.identity()));
        for (ShuttleBooking booking : bookingRepository.manifestFor(trip.getId())) {
            if (booking.getBoardedAt() != null) {
                continue;
            }
            int stopsAway = booking.getBoardingSeq() - stop.getSequence();
            String boardingStop = bySequence.get(booking.getBoardingSeq()).getName();
            if (stopsAway == 2) {
                notifyRider(booking, "SHUTTLE_TWO_STOPS_AWAY", boardingStop);
            } else if (stopsAway == 1) {
                notifyRider(booking, "SHUTTLE_ARRIVING", boardingStop);
            }
        }
    }

    /** Sends after commit, so nobody sees a stop that then rolls back. */
    private ShuttleLiveResponse publish(ShuttleTrip trip, String event) {
        ShuttleLiveResponse state = stateOf(trip, event);
        String topic = "/topic/shuttle-trips/" + trip.getId();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    messaging.convertAndSend(topic, state);
                }
            });
        } else {
            messaging.convertAndSend(topic, state);
        }
        return state;
    }

    private ShuttleLiveResponse stateOf(ShuttleTrip trip, String event) {
        List<RouteStop> stops = stopsOf(trip);
        Map<Short, Instant> arrivals = eventRepository.findByShuttleTripIdOrderBySequenceAsc(trip.getId())
                .stream().collect(Collectors.toMap(ShuttleStopEvent::getSequence, ShuttleStopEvent::getArrivedAt));
        Short current = trip.getCurrentStopSeq();
        long delaySeconds = delaySeconds(trip, stops, arrivals);
        Instant now = Instant.now();

        List<ShuttleLiveResponse.Stop> live = stops.stream().map(stop -> {
            Instant scheduled = scheduledAt(trip, stop);
            boolean passed = current != null && stop.getSequence() < current;
            boolean here = current != null && stop.getSequence() == current;
            Instant expected = passed || here ? null : latest(scheduled.plusSeconds(delaySeconds), now);
            return new ShuttleLiveResponse.Stop(stop.getId(), stop.getSequence(), stop.getName(),
                    stop.getLatitude().doubleValue(), stop.getLongitude().doubleValue(),
                    scheduled, expected, arrivals.get(stop.getSequence()),
                    passed ? "PASSED" : here ? "CURRENT" : "UPCOMING");
        }).toList();

        ShuttleLiveResponse.Vehicle vehicle = "RUNNING".equals(trip.getStatus())
                ? liveStore.find(trip.getId()).map(position -> new ShuttleLiveResponse.Vehicle(
                        position.latitude(), position.longitude(), position.heading(), position.at())).orElse(null)
                : null;

        return new ShuttleLiveResponse(event, trip.getId(), trip.getSchedule().getRoute().getName(),
                trip.getStatus(), current, (int) (delaySeconds / 60), vehicle, live);
    }

    // How late the run is: at the last stop reached, or at the start if none yet. Never negative -
    // a shuttle that is early waits at the stop.
    private long delaySeconds(ShuttleTrip trip, List<RouteStop> stops, Map<Short, Instant> arrivals) {
        if (trip.getCurrentStopSeq() != null) {
            RouteStop last = stops.stream().filter(stop -> stop.getSequence() == trip.getCurrentStopSeq())
                    .findFirst().orElse(null);
            if (last != null && arrivals.containsKey(last.getSequence())) {
                return Math.max(0, Duration.between(scheduledAt(trip, last), arrivals.get(last.getSequence())).toSeconds());
            }
        }
        if (trip.getStartedAt() != null) {
            return Math.max(0, Duration.between(trip.getDepartsAt(), trip.getStartedAt()).toSeconds());
        }
        return 0;
    }

    private static Instant scheduledAt(ShuttleTrip trip, RouteStop stop) {
        return trip.getDepartsAt().plus(Duration.ofMinutes(stop.getOffsetMinutes()));
    }

    private static Instant latest(Instant a, Instant b) {
        return a.isAfter(b) ? a : b;
    }

    private static RouteStop nextStop(ShuttleTrip trip, List<RouteStop> stops) {
        return stops.stream()
                .filter(stop -> trip.getCurrentStopSeq() == null || stop.getSequence() > trip.getCurrentStopSeq())
                .findFirst().orElse(null);
    }

    private List<RouteStop> stopsOf(ShuttleTrip trip) {
        return stopRepository.findByRouteIdOrderBySequenceAsc(trip.getSchedule().getRoute().getId());
    }

    private void notifyRider(ShuttleBooking booking, String eventType, String payload) {
        notifier.notifyUser(booking.getRider().getUser().getId(), eventType, payload,
                "SHUTTLE_BOOKING", booking.getId());
    }

    private static ShuttleTrip requireRunning(ShuttleTrip trip) {
        if (!"RUNNING".equals(trip.getStatus())) {
            throw new ValidationException("Start the run first.");
        }
        return trip;
    }

    private ShuttleTrip requireOwnTrip(String driverUserId, String tripId) {
        String driverId = driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."))
                .getId();
        ShuttleTrip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new NotFoundException("No such departure."));
        if (!driverId.equals(trip.getDriverId())) {
            throw new ForbiddenException("You are not driving that departure.");
        }
        return trip;
    }
}
