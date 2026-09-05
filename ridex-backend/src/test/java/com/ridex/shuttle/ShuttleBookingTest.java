package com.ridex.shuttle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shuttle.domain.*;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.shuttle.dto.BookSeatRequest;

/** Seat inventory, and the race that decides who actually gets 4A. */
@SpringBootTest
class ShuttleBookingTest {

    @Autowired private ShuttleService shuttleService;
    @Autowired private PassService passService;
    @Autowired private RouteRepository routeRepository;
    @Autowired private RouteFareRepository routeFareRepository;
    @Autowired private ShuttleScheduleRepository scheduleRepository;
    @Autowired private PassProductRepository passProductRepository;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    private Route route;
    private ShuttleSchedule schedule;
    private RouteStop first;
    private RouteStop last;
    private LocalDate serviceDate;

    @BeforeEach
    void setUp() {
        route = new Route();
        route.setCode("R" + System.nanoTime() % 100000);
        route.setName("Whitefield to Electronic City");
        for (int i = 0; i < 4; i++) {
            RouteStop stop = new RouteStop();
            stop.setSequence((short) (i + 1));
            stop.setName("Stop " + (i + 1));
            stop.setLatitude(new BigDecimal("12.9" + i));
            stop.setLongitude(new BigDecimal("77.6" + i));
            stop.setOffsetMinutes((short) (i * 15));
            route.addStop(stop);
        }
        routeRepository.save(route);
        first = route.getStops().get(0);
        last = route.getStops().get(3);

        RouteFare fare = new RouteFare();
        fare.setRouteId(route.getId());
        fare.setFromStopId(first.getId());
        fare.setToStopId(last.getId());
        fare.setCurrency("INR");
        fare.setFareMinor(6000);
        routeFareRepository.save(fare);

        schedule = new ShuttleSchedule();
        schedule.setRoute(route);
        schedule.setDepartureTime(LocalTime.of(9, 0));
        schedule.setDaysOfWeek("1,2,3,4,5,6,7");
        schedule.setSeatCapacity((short) 12);
        scheduleRepository.save(schedule);

        serviceDate = LocalDate.now().plusDays(1);
    }

    @Test
    void theSeatMapShowsEverySeatAndWhichAreGone() {
        var before = shuttleService.seatMap(schedule.getId(), serviceDate, null, null);
        assertThat(before.seats()).hasSize(12);
        assertThat(before.seatsAvailable()).isEqualTo(12);

        shuttleService.book(newRider(), request("3B"));

        var after = shuttleService.seatMap(schedule.getId(), serviceDate, null, null);
        assertThat(after.seatsAvailable()).isEqualTo(11);
        assertThat(after.seats()).filteredOn(seat -> seat.label().equals("3B"))
                .singleElement().extracting(seat -> seat.available()).isEqualTo(false);
    }

    @Test
    void twoRidersTappingTheSameSeatProduceOneBookingAndOneRefusal() throws Exception {
        String riderA = newRider();
        String riderB = newRider();

        AtomicInteger booked = new AtomicInteger();
        AtomicInteger refused = new AtomicInteger();
        List<Throwable> unexpected = java.util.Collections.synchronizedList(new java.util.ArrayList<>());
        CountDownLatch startTogether = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        for (String rider : List.of(riderA, riderB)) {
            pool.submit(() -> {
                try {
                    startTogether.await();
                    shuttleService.book(rider, request("3A"));
                    booked.incrementAndGet();
                } catch (ConflictException expected) {
                    refused.incrementAndGet();
                } catch (Throwable other) {
                    unexpected.add(other);
                }
            });
        }

        startTogether.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(20, TimeUnit.SECONDS)).isTrue();

        // Both pass an availability check; the partial unique index decides which insert survives.
        assertThat(unexpected).isEmpty();
        assertThat(booked.get()).as("one seat, one winner").isEqualTo(1);
        assertThat(refused.get()).as("the other is told to pick another").isEqualTo(1);
    }

    @Test
    void aCancelledSeatGoesBackIntoThePool() {
        String rider = newRider();
        var booking = shuttleService.book(rider, request("2C"));

        shuttleService.cancel(rider, booking.id());

        assertThat(shuttleService.seatMap(schedule.getId(), serviceDate, null, null).seats())
                .filteredOn(seat -> seat.label().equals("2C"))
                .singleElement().extracting(seat -> seat.available()).isEqualTo(true);
        // And somebody else can now take it.
        assertThat(shuttleService.book(newRider(), request("2C")).seatLabel()).isEqualTo("2C");
    }

    @Test
    void aPassCoversTheFareAndCountsARide() {
        String rider = newRider();

        PassProduct product = new PassProduct();
        product.setRoute(route);
        product.setName("Weekly commuter");
        product.setDurationDays((short) 7);
        product.setRideLimit((short) 10);
        product.setCurrency("INR");
        product.setPriceMinor(50000);
        passProductRepository.save(product);

        passService.buy(rider, product.getId(), LocalDate.now());
        var booking = shuttleService.book(rider, request("1A"));

        // Covered, so nothing is charged for the seat.
        assertThat(booking.fareMinor()).isZero();
        assertThat(booking.passId()).isNotNull();
        assertThat(passService.mine(rider).get(0).ridesUsed()).isEqualTo(1);
    }

    @Test
    void withoutAPassThePublishedStopPairFareApplies() {
        assertThat(shuttleService.book(newRider(), request("1B")).fareMinor()).isEqualTo(6000);
    }

    @Test
    void travellingBackwardsAlongTheRouteIsRefused() {
        assertThatThrownBy(() -> shuttleService.book(newRider(), new BookSeatRequest(
                schedule.getId(), serviceDate.toString(), last.getId(), first.getId(), "1C",
                PaymentMethod.CASH)))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void aSeatBeyondTheVehicleIsRefused() {
        // A twelve-seater has no 9D, and selling one strands somebody at the roadside.
        assertThatThrownBy(() -> shuttleService.book(newRider(), request("9D")))
                .isInstanceOf(ValidationException.class);
    }

    private BookSeatRequest request(String seat) {
        // Cash keeps these tests off the gateway: what they are about is seat inventory.
        return new BookSeatRequest(schedule.getId(), serviceDate.toString(),
                first.getId(), last.getId(), seat, PaymentMethod.CASH);
    }

    private String newRider() {
        User user = new User();
        user.setEmail("shuttle-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(UserRole.RIDER));
        userRepository.save(user);
        riderProfileService.createFor(user);
        return user.getId();
    }
}
