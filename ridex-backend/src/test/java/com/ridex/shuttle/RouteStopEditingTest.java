package com.ridex.shuttle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.payment.PaymentProviders;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shuttle.dto.AdminRouteResponse;
import com.ridex.shuttle.dto.BookSeatRequest;
import com.ridex.shuttle.dto.FareMatrixRequest;
import com.ridex.shuttle.dto.RouteRequest;
import com.ridex.shuttle.dto.ScheduleRequest;
import com.ridex.shuttle.dto.StopRequest;
import com.ridex.shared.exception.NotFoundException;

@SpringBootTest
class RouteStopEditingTest {

    @MockitoBean private PaymentProviders paymentProviders;
    @Autowired private AdminShuttleService admin;
    @Autowired private ShuttleService shuttleService;
    @Autowired private ShuttleBookingRepository bookingRepository;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    private AdminRouteResponse route;

    @BeforeEach
    void setUp() {
        FakeGateway.install(paymentProviders);
        route = admin.create(new RouteRequest("E" + System.nanoTime() % 1_000_000_000L, "Edit test", null, true));
        admin.addStop(route.id(), stop("A", 0), null);
        admin.addStop(route.id(), stop("B", 10), null);
        route = admin.addStop(route.id(), stop("C", 20), null);
        admin.setFares(route.id(), new FareMatrixRequest("INR", List.of(
                new FareMatrixRequest.Leg(id("A"), id("B"), 2000),
                new FareMatrixRequest.Leg(id("A"), id("C"), 3000),
                new FareMatrixRequest.Leg(id("B"), id("C"), 2000))));
        route = admin.addSchedule(route.id(), new ScheduleRequest(LocalTime.of(9, 0), "1,2,3,4,5,6,7", 12, 3, true));
    }

    @Test
    void insertingAStopRenumbersTheStopsAndTheBookingsWithThem() {
        String booking = book(id("A"), id("C"));

        route = admin.addStop(route.id(), stop("A2", 5), 1);

        assertThat(route.stops()).extracting(AdminRouteResponse.Stop::name).containsExactly("A", "A2", "B", "C");
        var seat = bookingRepository.findById(booking).orElseThrow();
        // Was 1 -> 3; C is now fourth, and the leg still spans the whole route.
        assertThat(seat.getBoardingSeq()).isEqualTo((short) 1);
        assertThat(seat.getAlightingSeq()).isEqualTo((short) 4);
    }

    @Test
    void aStopNobodyBookedCanBeDeletedWithItsFaresButABookedOneCannot() {
        book(id("A"), id("B"));

        route = admin.removeStop(route.id(), id("C"));
        assertThat(route.stops()).extracting(AdminRouteResponse.Stop::name).containsExactly("A", "B");
        assertThat(route.fares()).hasSize(1);

        assertThatThrownBy(() -> admin.removeStop(route.id(), id("B"))).isInstanceOf(ConflictException.class);
    }

    @Test
    void aStopCannotBeTimedOutOfOrder() {
        assertThatThrownBy(() -> admin.updateStop(route.id(), id("B"), stop("B", 25)))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> admin.addStop(route.id(), stop("X", 15), 1))
                .isInstanceOf(ValidationException.class);

        route = admin.updateStop(route.id(), id("B"), stop("B renamed", 12));
        assertThat(route.stops().get(1).name()).isEqualTo("B renamed");
    }

    @Test
    void aRouteNobodyBookedCanBeDeletedButABookedOneCannot() {
        var empty = admin.create(new RouteRequest("D" + System.nanoTime() % 1_000_000_000L, "Delete me", null, false));
        admin.addStop(empty.id(), stop("A", 0), null);
        var built = admin.addStop(empty.id(), stop("B", 10), null);
        // Fares and a timetable too - the parts that point at the stops.
        admin.setFares(empty.id(), new FareMatrixRequest("INR", List.of(
                new FareMatrixRequest.Leg(built.stops().get(0).id(), built.stops().get(1).id(), 2000))));
        admin.addSchedule(empty.id(), new ScheduleRequest(LocalTime.of(10, 0), "1,2,3,4,5", 12, 3, true));
        admin.deleteRoute(empty.id());
        assertThatThrownBy(() -> admin.route(empty.id())).isInstanceOf(NotFoundException.class);

        book(id("A"), id("B"));
        assertThatThrownBy(() -> admin.deleteRoute(route.id())).isInstanceOf(ConflictException.class);
    }

    private String book(String from, String to) {
        User user = new User();
        user.setEmail("edit-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(UserRole.RIDER));
        userRepository.save(user);
        riderProfileService.createFor(user);
        var booking = shuttleService.book(user.getId(), new BookSeatRequest(route.schedules().get(0).id(),
                LocalDate.now().plusDays(1).toString(), from, to, "1A", PaymentMethod.UPI, null));
        shuttleService.confirmPayment(user.getId(), booking.id(), "pay_" + booking.id());
        return booking.id();
    }

    private String id(String name) {
        return route.stops().stream().filter(stop -> stop.name().equals(name)).findFirst().orElseThrow().id();
    }

    private static StopRequest stop(String name, int offset) {
        return new StopRequest(name, new BigDecimal("22.57"), new BigDecimal("88.36"), offset);
    }
}
