package com.ridex.shuttle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.DriverProfileService;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.payment.PaymentProviders;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shuttle.domain.Route;
import com.ridex.shuttle.domain.RouteFare;
import com.ridex.shuttle.domain.RouteStop;
import com.ridex.shuttle.domain.ShuttleSchedule;
import com.ridex.shuttle.dto.BookSeatRequest;
import com.ridex.payment.LedgerService;
import com.ridex.payment.domain.LedgerAccountType;
import com.ridex.shuttle.dto.ShuttleBookingResponse;
import java.util.Currency;
import java.util.HashMap;
import java.util.Map;

/**
 * The driver's half of a shuttle seat: the manifest, and the code at the door.
 *
 * <p>The partner app is the only thing that calls these, so this is what stands behind "a seat
 * booked on the rider app can be boarded from the partner app".
 */
@SpringBootTest
class DriverBoardingTest {

    @Autowired private ShuttleService shuttleService;
    @Autowired private DriverShuttleService driverShuttleService;
    @Autowired private ShuttleTripRepository shuttleTripRepository;
    @Autowired private RouteRepository routeRepository;
    @Autowired private RouteFareRepository routeFareRepository;
    @Autowired private ShuttleScheduleRepository scheduleRepository;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;
    @Autowired private AdminShuttleService adminShuttleService;
    @MockitoBean private PaymentProviders paymentProviders;
    @Autowired private LedgerService ledger;

    private ShuttleSchedule schedule;
    private RouteStop first;
    private RouteStop last;
    private LocalDate serviceDate;
    private String driverUserId;

    @BeforeEach
    void setUp() {
        FakeGateway.install(paymentProviders);
        Route route = new Route();
        // Wide enough not to collide: these tests commit, so yesterday's rows are still here.
        route.setCode("B" + System.nanoTime());
        route.setName("Whitefield to Electronic City");
        for (int i = 0; i < 3; i++) {
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
        last = route.getStops().get(2);

        RouteFare fare = new RouteFare();
        fare.setRouteId(route.getId());
        fare.setFromStopId(first.getId());
        fare.setToStopId(last.getId());
        fare.setCurrency("INR");
        fare.setFareMinor(6000);
        routeFareRepository.save(fare);

        schedule = new ShuttleSchedule();
        schedule.setRoute(route);
        schedule.setDepartureTime(LocalTime.of(8, 15));
        schedule.setDaysOfWeek("1,2,3,4,5,6,7");
        schedule.setSeatCapacity((short) 12);
        scheduleRepository.save(schedule);

        serviceDate = LocalDate.now().plusDays(1);

        User user = newUser(UserRole.DRIVER);
        DriverProfile profile = driverProfileService.createFor(user);
        profile.setOnboardingStatus(DriverOnboardingStatus.APPROVED);
        driverProfileRepository.save(profile);
        driverUserId = user.getId();
    }

    @Test
    void aBookedSeatIsOnTheDriversManifestAndBoardsAgainstItsCode() {
        var booking = bookPaidSeat("2A");
        rosterDriverOntoTheDeparture();

        var runs = driverShuttleService.departures(driverUserId, serviceDate);
        assertThat(runs).singleElement()
                .extracting(run -> run.seatsSold()).isEqualTo(1);

        var manifest = driverShuttleService.board(driverUserId, runs.get(0).shuttleTripId(),
                booking.id(), booking.boardingCode());

        assertThat(manifest.stops())
                .flatExtracting(stop -> stop.boarding())
                .singleElement()
                .satisfies(passenger -> {
                    assertThat(passenger.seatLabel()).isEqualTo("2A");
                    assertThat(passenger.boarded()).isTrue();
                });
    }

    @Test
    void aCancelledPaidSeatSplitsWhatTheRiderForfeitsWithTheDriver() {
        var booking = bookPaidSeat("1A");
        rosterDriverOntoTheDeparture();
        String driverId = driverProfileRepository.findByUserId(driverUserId).orElseThrow().getId();
        Currency inr = Currency.getInstance("INR");
        long before = ledger.balanceOf(LedgerAccountType.DRIVER, driverId, inr).amountMinor();

        shuttleService.cancel(riderOf(booking), booking.id());

        // Rs 60 paid, Rs 48 back to the rider as points, Rs 12 forfeited - 80% of that to the driver.
        long after = ledger.balanceOf(LedgerAccountType.DRIVER, driverId, inr).amountMinor();
        assertThat(after - before).isEqualTo(960);
    }

    @Test
    void aSeatStillInCheckoutCannotBoard() {
        var booking = bookSeat("2D", false);
        rosterDriverOntoTheDeparture();
        String tripId = driverShuttleService.departures(driverUserId, serviceDate)
                .get(0).shuttleTripId();

        assertThatThrownBy(() ->
                driverShuttleService.board(driverUserId, tripId, booking.id(), booking.boardingCode()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void aCodeThatDoesNotMatchTheSeatBoardsNobody() {
        var booking = bookPaidSeat("2B");
        rosterDriverOntoTheDeparture();
        String tripId = driverShuttleService.departures(driverUserId, serviceDate)
                .get(0).shuttleTripId();

        assertThatThrownBy(() ->
                driverShuttleService.board(driverUserId, tripId, booking.id(), "000000"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void oneTicketCannotBoardTwice() {
        var booking = bookPaidSeat("2C");
        rosterDriverOntoTheDeparture();
        String tripId = driverShuttleService.departures(driverUserId, serviceDate)
                .get(0).shuttleTripId();

        driverShuttleService.board(driverUserId, tripId, booking.id(), booking.boardingCode());

        assertThatThrownBy(() -> driverShuttleService.board(driverUserId, tripId, booking.id(),
                booking.boardingCode()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void opsSeesTheRunWithItsCancelledSeatsStillOnIt() {
        var kept = bookPaidSeat("3A");
        var dropped = bookPaidSeat("3B");
        shuttleService.cancel(riderOf(dropped), dropped.id());
        rosterDriverOntoTheDeparture();

        // Filtered to this test's own schedule: the date carries every departure on the platform,
        // including the ones other tests left behind.
        var departures = adminShuttleService.departures(serviceDate).stream()
                .filter(departure -> departure.scheduleId().equals(schedule.getId()))
                .toList();

        assertThat(departures).singleElement().satisfies(departure -> {
            assertThat(departure.seatsSold()).isEqualTo(1);
            // Listed, not hidden: "why is 3B empty when it sold" is an ops question, and a
            // manifest that drops the row cannot answer it.
            assertThat(departure.seatsCancelled()).isEqualTo(1);
            assertThat(departure.seats()).extracting(seat -> seat.seatLabel())
                    .containsExactlyInAnyOrder("3A", "3B");
            assertThat(departure.driverId()).isNotNull();
        });
        assertThat(kept.id()).isNotBlank();
    }

    /** The departure exists only once a seat has sold, so this runs after the booking. */
    private void rosterDriverOntoTheDeparture() {
        var trip = shuttleTripRepository
                .findByScheduleIdAndServiceDate(schedule.getId(), serviceDate).orElseThrow();
        trip.setDriverId(driverProfileRepository.findByUserId(driverUserId).orElseThrow().getId());
        shuttleTripRepository.save(trip);
    }

    private ShuttleBookingResponse bookPaidSeat(String seat) {
        return bookSeat(seat, true);
    }

    private ShuttleBookingResponse bookSeat(String seat, boolean pay) {
        User user = newUser(UserRole.RIDER);
        riderProfileService.createFor(user);
        // The fresh response, because only it carries the raw boarding code - the stored row keeps
        // a hash, which is the whole point of the code.
        var booking = shuttleService.book(user.getId(), new BookSeatRequest(schedule.getId(),
                serviceDate.toString(), first.getId(), last.getId(), seat, PaymentMethod.UPI,
                null));
        riderOfBooking.put(booking.id(), user.getId());
        if (pay) {
            shuttleService.confirmPayment(user.getId(), booking.id(), "pay_" + booking.id());
        }
        return booking;
    }

    /** Who booked which seat, so a test can cancel one as its own rider. */
    private final Map<String, String> riderOfBooking = new HashMap<>();

    private String riderOf(ShuttleBookingResponse booking) {
        return riderOfBooking.get(booking.id());
    }

    private User newUser(UserRole role) {
        User user = new User();
        user.setEmail("boarding-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
