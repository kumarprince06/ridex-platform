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
import com.ridex.notification.OutboxRepository;
import com.ridex.payment.PaymentProviders;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.rider.RiderProfileService;
import com.ridex.shuttle.dto.AdminRouteResponse;
import com.ridex.shuttle.dto.BookSeatRequest;
import com.ridex.shuttle.dto.FareMatrixRequest;
import com.ridex.shuttle.dto.PassPricingRequest;
import com.ridex.shuttle.dto.RouteRequest;
import com.ridex.shuttle.dto.ScheduleRequest;
import com.ridex.shuttle.dto.StopRequest;

@SpringBootTest
class PassPlansTest {

    @MockitoBean private PaymentProviders paymentProviders;
    @Autowired private AdminShuttleService admin;
    @Autowired private PassService passService;
    @Autowired private ShuttleService shuttleService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;
    @Autowired private OutboxRepository outboxRepository;

    private AdminRouteResponse passRoute;
    private AdminRouteResponse otherRoute;
    private String rider;

    @BeforeEach
    void setUp() {
        FakeGateway.install(paymentProviders);
        passRoute = route("P");
        otherRoute = route("Q");
        rider = newRider();
    }

    @Test
    void longerPlansArePricedFromTheMonthlyOneWithTheirDiscount() {
        var pricing = admin.setPassPricing(passRoute.id(), new PassPricingRequest(150_000, 10, 15, 20, true, 26, null));

        assertThat(pricing.plans()).extracting(plan -> plan.priceMinor())
                // Rs 1,500 a month; a quarter at 10% off, half a year at 15%, a year at 20%.
                .containsExactly(150_000L, 405_000L, 765_000L, 1_440_000L);
        var onSale = passService.productsFor(passRoute.id());
        assertThat(onSale).extracting(product -> product.savePercent()).containsExactly(0, 10, 15, 20);
        assertThat(onSale.get(3).perMonthMinor()).isEqualTo(120_000L);
    }

    @Test
    void aPassMakesSeatsFreeOnItsOwnRouteOnlyAndStillConfirmsTheBooking() {
        admin.setPassPricing(passRoute.id(), new PassPricingRequest(150_000, 10, 15, 20, true, 26, null));
        var monthly = passService.productsFor(passRoute.id()).get(0);
        var pass = passService.buy(rider, monthly.id(), null, PaymentMethod.UPI, null);
        passService.confirmPayment(rider, pass.id(), "pay_" + pass.id());
        String date = LocalDate.now().plusDays(1).toString();

        var covered = shuttleService.seatMap(passRoute.schedules().get(0).id(), LocalDate.parse(date),
                passRoute.stops().get(0).id(), passRoute.stops().get(1).id(), rider);
        assertThat(covered.coveredByPassUntil()).isNotNull();

        var onPass = shuttleService.book(rider, request(passRoute, date));
        assertThat(onPass.passId()).isEqualTo(pass.id());
        assertThat(onPass.paymentStatus()).isEqualTo("PAID");
        assertThat(outboxRepository.findAll()).anyMatch(message ->
                "SHUTTLE_BOOKED".equals(message.getEventType()) && rider.equals(message.getRecipient()));

        // A different route is not covered: the rider pays for it.
        var elsewhere = shuttleService.book(rider, request(otherRoute, date));
        assertThat(elsewhere.passId()).isNull();
        assertThat(elsewhere.paymentStatus()).isEqualTo("PENDING");
        assertThat(shuttleService.seatMap(otherRoute.schedules().get(0).id(), LocalDate.parse(date),
                otherRoute.stops().get(0).id(), otherRoute.stops().get(1).id(), rider).coveredByPassUntil()).isNull();
    }

    @Test
    void aPassCoversOnlyAsManyRidesAsItIncludesThenSeatsArePaid() {
        admin.setPassPricing(passRoute.id(), new PassPricingRequest(150_000, 0, 0, 0, true, 1, null));
        var monthly = passService.productsFor(passRoute.id()).get(0);
        assertThat(monthly.rideLimit()).isEqualTo(1);
        var pass = passService.buy(rider, monthly.id(), null, PaymentMethod.UPI, null);
        passService.confirmPayment(rider, pass.id(), "pay_" + pass.id());

        String today = LocalDate.now().plusDays(1).toString();
        String later = LocalDate.now().plusDays(2).toString();
        assertThat(shuttleService.book(rider, request(passRoute, today)).passId()).isEqualTo(pass.id());
        // The one ride is used, so the next seat is paid for.
        assertThat(shuttleService.book(rider, request(passRoute, later)).passId()).isNull();
    }

    @Test
    void aRouteSellsNoMorePassesThanItsLimit() {
        admin.setPassPricing(passRoute.id(), new PassPricingRequest(150_000, 0, 0, 0, true, 26, 1));
        var monthly = passService.productsFor(passRoute.id()).get(0);
        var first = passService.buy(rider, monthly.id(), null, PaymentMethod.UPI, null);
        passService.confirmPayment(rider, first.id(), "pay_" + first.id());

        assertThat(passService.productsFor(passRoute.id()).get(0).soldOut()).isTrue();
        String second = newRider();
        assertThatThrownBy(() -> passService.buy(second, monthly.id(), null, PaymentMethod.UPI, null))
                .isInstanceOf(com.ridex.shared.exception.ConflictException.class);
    }

    private AdminRouteResponse route(String prefix) {
        var route = admin.create(new RouteRequest(prefix + System.nanoTime() % 1_000_000_000L, prefix + " route", null, true));
        admin.addStop(route.id(), stop("A", 0), null);
        route = admin.addStop(route.id(), stop("B", 10), null);
        admin.setFares(route.id(), new FareMatrixRequest("INR", List.of(
                new FareMatrixRequest.Leg(route.stops().get(0).id(), route.stops().get(1).id(), 3000))));
        return admin.addSchedule(route.id(), new ScheduleRequest(LocalTime.of(9, 0), "1,2,3,4,5,6,7", 12, 3, true));
    }

    private static BookSeatRequest request(AdminRouteResponse route, String date) {
        return new BookSeatRequest(route.schedules().get(0).id(), date, route.stops().get(0).id(),
                route.stops().get(1).id(), "1A", PaymentMethod.UPI, null);
    }

    private String newRider() {
        User user = new User();
        user.setEmail("pass-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(UserRole.RIDER));
        userRepository.save(user);
        riderProfileService.createFor(user);
        return user.getId();
    }

    private static StopRequest stop(String name, int offset) {
        return new StopRequest(name, new BigDecimal("22.57"), new BigDecimal("88.36"), offset);
    }
}
