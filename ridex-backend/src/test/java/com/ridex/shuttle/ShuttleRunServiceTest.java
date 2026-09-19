package com.ridex.shuttle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.driver.DriverProfileService;
import com.ridex.notification.OutboxRepository;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shuttle.domain.Route;
import com.ridex.shuttle.domain.RouteFare;
import com.ridex.shuttle.domain.RouteStop;
import com.ridex.shuttle.domain.ShuttleSchedule;
import com.ridex.shuttle.dto.BookSeatRequest;

@SpringBootTest
class ShuttleRunServiceTest {

    @Autowired private ShuttleRunService runService;
    @Autowired private ShuttleService shuttleService;
    @Autowired private ShuttleTripRepository tripRepository;
    @Autowired private ShuttleStopEventRepository eventRepository;
    @Autowired private RouteRepository routeRepository;
    @Autowired private RouteFareRepository fareRepository;
    @Autowired private ShuttleScheduleRepository scheduleRepository;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private UserRepository userRepository;
    @Autowired private OutboxRepository outboxRepository;

    private Route route;
    private String tripId;
    private String driverUserId;
    private String riderUserId;
    private String bookingId;

    @BeforeEach
    void setUp() {
        route = new Route();
        route.setCode("L" + System.nanoTime());
        route.setName("Salt Lake to Howrah");
        for (int i = 0; i < 4; i++) {
            RouteStop stop = new RouteStop();
            stop.setSequence((short) (i + 1));
            stop.setName("Stop " + (i + 1));
            // About a kilometre apart, so each ping is near exactly one stop.
            stop.setLatitude(new BigDecimal("22.5" + i));
            stop.setLongitude(new BigDecimal("88.35"));
            stop.setOffsetMinutes((short) (i * 10));
            route.addStop(stop);
        }
        routeRepository.save(route);

        RouteFare fare = new RouteFare();
        fare.setRouteId(route.getId());
        fare.setFromStopId(stop(3).getId());
        fare.setToStopId(stop(4).getId());
        fare.setCurrency("INR");
        fare.setFareMinor(3000);
        fareRepository.save(fare);

        ShuttleSchedule schedule = new ShuttleSchedule();
        schedule.setRoute(route);
        schedule.setDepartureTime(LocalTime.of(9, 0));
        schedule.setDaysOfWeek("1,2,3,4,5,6,7");
        schedule.setSeatCapacity((short) 12);
        scheduleRepository.save(schedule);

        LocalDate date = LocalDate.now().plusDays(1);
        riderUserId = newUser(UserRole.RIDER);
        riderProfileService.createFor(userRepository.findById(riderUserId).orElseThrow());
        // Boards at stop 3, so reaching stop 1 is "two away" and stop 2 is "arriving".
        bookingId = shuttleService.book(riderUserId, new BookSeatRequest(schedule.getId(), date.toString(),
                stop(3).getId(), stop(4).getId(), "2A", PaymentMethod.CASH, null)).id();

        driverUserId = newUser(UserRole.DRIVER);
        var driver = driverProfileService.createFor(userRepository.findById(driverUserId).orElseThrow());
        var trip = tripRepository.findByScheduleIdAndServiceDate(schedule.getId(), date).orElseThrow();
        trip.setDriverId(driver.getId());
        trip.setDepartsAt(Instant.now().plusSeconds(600));
        tripRepository.save(trip);
        tripId = trip.getId();
    }

    @Test
    void aRunMovesStopByStopFromTheDriversGps() {
        runService.start(driverUserId, tripId);

        var atFirst = runService.reportPosition(driverUserId, tripId, 22.5, 88.35, 180.0);
        assertThat(atFirst.event()).isEqualTo("STOP_REACHED");
        assertThat(atFirst.currentStopSequence()).isEqualTo((short) 1);

        // The same stop again is just a position update, not a second arrival.
        runService.reportPosition(driverUserId, tripId, 22.5001, 88.35, 180.0);
        assertThat(eventRepository.findByShuttleTripIdOrderBySequenceAsc(tripId)).hasSize(1);

        var live = runService.forRider(riderUserId, bookingId);
        assertThat(live.boardingSequence()).isEqualTo((short) 3);
        assertThat(live.trip().stops().get(0).state()).isEqualTo("CURRENT");
        assertThat(live.trip().stops().get(2).expectedAt()).isNotNull();
        assertThat(live.trip().vehicle()).isNotNull();
    }

    @Test
    void theRiderIsToldAsTheShuttleGetsCloseOnceEach() {
        runService.start(driverUserId, tripId);
        runService.reportPosition(driverUserId, tripId, 22.5, 88.35, null);
        runService.reportPosition(driverUserId, tripId, 22.51, 88.35, null);
        runService.reportPosition(driverUserId, tripId, 22.51, 88.35, null);

        assertThat(alerts("SHUTTLE_STARTED")).isEqualTo(1);
        assertThat(alerts("SHUTTLE_TWO_STOPS_AWAY")).isEqualTo(1);
        assertThat(alerts("SHUTTLE_ARRIVING")).isEqualTo(1);
    }

    @Test
    void theDriverCanMarkAMissedStopButNeverGoBack() {
        runService.start(driverUserId, tripId);
        runService.arrive(driverUserId, tripId, stop(2).getId());

        assertThatThrownBy(() -> runService.arrive(driverUserId, tripId, stop(1).getId()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void onlyTheRunsRidersAndDriverMayWatchIt() {
        assertThat(runService.canWatch(riderUserId, tripId)).isTrue();
        assertThat(runService.canWatch(driverUserId, tripId)).isTrue();
        assertThat(runService.canWatch(newUser(UserRole.RIDER), tripId)).isFalse();
    }

    @Test
    void finishingEndsTheRunAndStopsTracking() {
        runService.start(driverUserId, tripId);
        runService.reportPosition(driverUserId, tripId, 22.5, 88.35, null);

        var done = runService.finish(driverUserId, tripId);

        assertThat(done.status()).isEqualTo("COMPLETED");
        assertThat(done.vehicle()).isNull();
    }

    private long alerts(String eventType) {
        return outboxRepository.findAll().stream()
                .filter(message -> riderUserId.equals(message.getRecipient()) && eventType.equals(message.getEventType()))
                .count();
    }

    private RouteStop stop(int sequence) {
        return route.getStops().get(sequence - 1);
    }

    private String newUser(UserRole role) {
        User user = new User();
        user.setEmail("run-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user).getId();
    }
}
