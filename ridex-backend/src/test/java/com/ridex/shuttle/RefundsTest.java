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
import com.ridex.payment.PaymentRepository;
import com.ridex.payment.RefundService;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.points.PointsService;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shuttle.dto.AdminRouteResponse;
import com.ridex.shuttle.dto.BookSeatRequest;
import com.ridex.shuttle.dto.FareMatrixRequest;
import com.ridex.shuttle.dto.PassPricingRequest;
import com.ridex.shuttle.dto.RouteRequest;
import com.ridex.shuttle.dto.ScheduleRequest;
import com.ridex.shuttle.dto.StopRequest;

@SpringBootTest
class RefundsTest {

    @MockitoBean private PaymentProviders paymentProviders;
    @Autowired private AdminShuttleService admin;
    @Autowired private ShuttleService shuttleService;
    @Autowired private PassService passService;
    @Autowired private PointsService pointsService;
    @Autowired private RefundService refundService;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ShuttleBookingRepository bookingRepository;
    @Autowired private PassRepository passRepository;
    @Autowired private OutboxRepository outboxRepository;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    private AdminRouteResponse route;
    private final String date = LocalDate.now().plusDays(1).toString();

    @BeforeEach
    void setUp() {
        FakeGateway.install(paymentProviders);
        route = admin.create(new RouteRequest("R" + System.nanoTime() % 1_000_000_000L, "Refund test", null, true));
        admin.addStop(route.id(), stop("A", 0), null);
        route = admin.addStop(route.id(), stop("B", 10), null);
        admin.setFares(route.id(), new FareMatrixRequest("INR", List.of(
                new FareMatrixRequest.Leg(route.stops().get(0).id(), route.stops().get(1).id(), 6000))));
        route = admin.addSchedule(route.id(), new ScheduleRequest(LocalTime.of(9, 0), "1,2,3,4,5,6,7", 12, 3, true));
    }

    @Test
    void cancellingADepartureGivesEveryoneTheirWholeFareAndPassRideBack() {
        String payer = rider();
        var paid = shuttleService.book(payer, seat("1A"));
        shuttleService.confirmPayment(payer, paid.id(), "pay_" + paid.id());

        admin.setPassPricing(route.id(), new PassPricingRequest(100_000, 0, 0, 0, true, 26, null));
        String holder = rider();
        var pass = passService.buy(holder, passService.productsFor(route.id()).get(0).id(), null, PaymentMethod.UPI, null);
        passService.confirmPayment(holder, pass.id(), "pay_" + pass.id());
        var onPass = shuttleService.book(holder, seat("1B"));

        int cancelled = shuttleService.cancelDeparture(
                bookingRepository.findById(paid.id()).orElseThrow().getShuttleTrip().getId(), "Bus broke down.");

        assertThat(cancelled).isEqualTo(2);
        // The whole Rs 60, not the 80% a rider's own cancellation earns.
        assertThat(pointsService.balance(payer).balance()).isEqualTo(pointsService.pointsFor(6000));
        assertThat(passRepository.findById(pass.id()).orElseThrow().getRidesUsed()).isZero();
        assertThat(bookingRepository.findById(onPass.id()).orElseThrow().getStatus()).isEqualTo("CANCELLED");
        assertThat(outboxRepository.findAll()).anyMatch(message ->
                "SHUTTLE_DEPARTURE_CANCELLED".equals(message.getEventType()) && payer.equals(message.getRecipient()));
        assertThatThrownBy(() -> shuttleService.book(rider(), seat("2A"))).isInstanceOf(ConflictException.class);
    }

    @Test
    void aRefundIsPaidAsPointsAndNeverExceedsWhatWasPaid() {
        String payer = rider();
        var paid = shuttleService.book(payer, seat("1C"));
        shuttleService.confirmPayment(payer, paid.id(), "pay_" + paid.id());
        String paymentId = paymentRepository.findByShuttleBookingId(paid.id()).orElseThrow().getId();

        refundService.refundAsPoints(paymentId, 2000, "Driver skipped a stop", null);
        assertThat(pointsService.balance(payer).balance()).isEqualTo(pointsService.pointsFor(2000));

        assertThatThrownBy(() -> refundService.refundAsPoints(paymentId, 5000, "Too much", null))
                .isInstanceOf(ValidationException.class);
        refundService.refundAsPoints(paymentId, 4000, "The rest", null);
        assertThat(paymentRepository.findById(paymentId).orElseThrow().getStatus())
                .isEqualTo(com.ridex.payment.domain.PaymentStatus.REFUNDED);
    }

    private BookSeatRequest seat(String label) {
        return new BookSeatRequest(route.schedules().get(0).id(), date, route.stops().get(0).id(),
                route.stops().get(1).id(), label, PaymentMethod.UPI, null);
    }

    private String rider() {
        User user = new User();
        user.setEmail("refund-" + System.nanoTime() + "@example.com");
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
