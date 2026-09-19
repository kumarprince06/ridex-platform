package com.ridex.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Currency;
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
import com.ridex.dispatch.DispatchService;
import com.ridex.dispatch.OfferNotifier;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.DriverProfileService;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.location.DriverPresence;
import com.ridex.maps.MapsService;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.payment.LedgerService;
import com.ridex.payment.PaymentProvider;
import com.ridex.payment.PaymentProvider.ProviderPayment;
import com.ridex.payment.PaymentProviders;
import com.ridex.payment.domain.LedgerAccountType;
import com.ridex.pricing.FareEstimateService;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.RideRequestService;
import com.ridex.ride.domain.CancellationReason;
import com.ridex.ride.dto.CancelRideRequest;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shared.money.Money;
import com.ridex.trip.TripRepository;
import com.ridex.trip.TripService;
import com.ridex.payment.PaymentWebhookService;

// Not @Transactional: dispatch runs in REQUIRES_NEW and cannot see a ride the test never committed.
@SpringBootTest
class DriverWalletAndCancellationTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);
    private static final Currency INR = Currency.getInstance("INR");

    @MockitoBean private MapsService mapsProvider;
    @MockitoBean private DriverPresence driverPresence;
    @MockitoBean private OfferNotifier offerNotifier;
    @MockitoBean private PaymentProviders paymentProviders;

    @Autowired private DriverWalletService walletService;
    @Autowired private LedgerService ledger;
    @Autowired private AdminWalletQueries adminWallets;
    @Autowired private PaymentWebhookService webhooks;
    @Autowired private TripService tripService;
    @Autowired private TripRepository tripRepository;
    @Autowired private DispatchService dispatchService;
    @Autowired private RideRequestService rideRequestService;
    @Autowired private RideRequestRepository rideRequestRepository;
    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    private final PaymentProvider gateway = mock(PaymentProvider.class);

    private String riderUserId;
    private String driverUserId;
    private String driverId;
    private String rideId;
    private String tripId;

    @BeforeEach
    void setUp() {
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins", null));
        when(paymentProviders.forMethod(any())).thenReturn(gateway);
        when(gateway.name()).thenReturn("RAZORPAY");

        riderUserId = newUser(UserRole.RIDER);
        riderProfileService.createFor(userRepository.findById(riderUserId).orElseThrow());
        driverUserId = newApprovedDriver();
        driverId = driverProfileRepository.findByUserId(driverUserId).orElseThrow().getId();
        when(driverPresence.nearby(anyDouble(), anyDouble(), anyDouble(), anyInt())).thenReturn(List.of(driverId));

        rideId = rideRequestService.create(riderUserId, new CreateRideRequest(
                fareEstimateService.estimate(riderUserId, ROUTE).get(0).estimateId(),
                "Koramangala", "Indiranagar", null, null)).id();
        dispatchService.offerRide(rideId, 1);
        tripId = dispatchService.accept(driverUserId,
                dispatchService.liveOffers(driverUserId).get(0).offerId()).tripId();
    }

    @Test
    void aLateRiderCancellationIsChargedAndMostOfItGoesToTheDriver() {
        acceptedSecondsAgo(600);

        var ride = rideRequestService.cancel(riderUserId, rideId,
                new CancelRideRequest(CancellationReason.PLANS_CHANGED, null));

        // The seeded Rs 30 after the two-minute grace - never charged before assignedAt was read.
        assertThat(ride.cancellationFeeMinor()).isEqualTo(3000);
        assertThat(balance()).isEqualTo(2400);
    }

    @Test
    void aDriverCancellingInsideTheWindowPaysNothing() {
        rideRequestService.cancelAsDriver(driverUserId, rideId,
                new CancelRideRequest(CancellationReason.VEHICLE_PROBLEM, null));

        assertThat(balance()).isZero();
    }

    @Test
    void aDriverCancellingAfterTheWindowIsPenalised() {
        acceptedSecondsAgo(120);

        var quote = rideRequestService.quoteDriverCancellation(driverUserId, rideId, CancellationReason.VEHICLE_PROBLEM);
        rideRequestService.cancelAsDriver(driverUserId, rideId,
                new CancelRideRequest(CancellationReason.VEHICLE_PROBLEM, null));

        // The quote the app showed is what was charged.
        assertThat(quote.penaltyMinor()).isEqualTo(2000);
        assertThat(balance()).isEqualTo(-2000);
    }

    @Test
    void aNoShowAfterWaitingIsFreeForTheDriverAndTheRiderPays() {
        acceptedSecondsAgo(900);
        arrivedSecondsAgo(400);

        var ride = rideRequestService.cancelAsDriver(driverUserId, rideId,
                new CancelRideRequest(CancellationReason.RIDER_NOT_AT_PICKUP, null));

        assertThat(ride.cancellationFeeMinor()).isEqualTo(5000);
        assertThat(balance()).isEqualTo(4000);
    }

    @Test
    void aNoShowClaimedTooSoonIsPenalised() {
        acceptedSecondsAgo(900);
        arrivedSecondsAgo(60);

        var ride = rideRequestService.cancelAsDriver(driverUserId, rideId,
                new CancelRideRequest(CancellationReason.RIDER_NOT_AT_PICKUP, null));

        assertThat(ride.cancellationFeeMinor()).isZero();
        assertThat(balance()).isEqualTo(-2000);
    }

    @Test
    void theLimitItselfStillGetsOffersAndAnythingBelowItDoesNot() {
        owe(5000);
        assertThat(walletService.blockedReason(driverId)).isNull();

        owe(1);
        assertThat(walletService.blockedReason(driverId)).contains("50.01");
        assertThat(walletService.walletFor(driverUserId).dueMinor()).isEqualTo(5001);
    }

    @Test
    void aTopUpClearsTheWalletOnceAndOnlyForItsOwnOrder() {
        owe(8000);
        // Unique per run: the test database outlives it, and a reused id is rightly refused.
        String paid = "pay_" + System.nanoTime();
        String foreign = "pay_foreign_" + System.nanoTime();
        when(gateway.createPaymentIntent(any(), anyString(), anyString()))
                .thenReturn(new ProviderPayment("order_wallet", "PENDING", null));
        var checkout = walletService.startTopUp(driverUserId, "tap-" + paid);
        // A double tap: same key, same checkout, still one gateway order.
        assertThat(walletService.startTopUp(driverUserId, "tap-" + paid).topUpId()).isEqualTo(checkout.topUpId());
        assertThat(checkout.amountMinor()).isEqualTo(8000);

        when(gateway.confirmPayment(foreign))
                .thenReturn(new ProviderPayment(foreign, "SUCCEEDED", null, "order_someone_else", 8000));
        assertThatThrownBy(() -> walletService.confirmTopUp(driverUserId, checkout.topUpId(), foreign))
                .isInstanceOf(ValidationException.class);

        when(gateway.confirmPayment(paid))
                .thenReturn(new ProviderPayment(paid, "SUCCEEDED", null, "order_wallet", 8000));
        assertThat(walletService.confirmTopUp(driverUserId, checkout.topUpId(), paid).balanceMinor()).isZero();

        // The same captured payment cannot pay a second top-up.
        owe(3000);
        var second = walletService.startTopUp(driverUserId, "tap2-" + paid);
        assertThatThrownBy(() -> walletService.confirmTopUp(driverUserId, second.topUpId(), paid))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void aTopUpTheAppNeverConfirmedIsCreditedByTheWebhookOnce() {
        owe(6000);
        String order = "order_hook_" + System.nanoTime();
        String paid = "pay_hook_" + System.nanoTime();
        when(gateway.createPaymentIntent(any(), anyString(), anyString()))
                .thenReturn(new ProviderPayment(order, "PENDING", null));
        walletService.startTopUp(driverUserId, "tap-" + paid);

        webhooks.handle(captured(paid, order, 6000), "evt_" + paid);
        // A redelivery under a new event id must not credit it twice.
        webhooks.handle(captured(paid, order, 6000), "evt2_" + paid);

        assertThat(balance()).isZero();
    }

    static String captured(String paymentId, String orderId, long amount) {
        return """
                {"event":"payment.captured","payload":{"payment":{"entity":
                {"id":"%s","order_id":"%s","amount":%d,"status":"captured"}}}}
                """.formatted(paymentId, orderId, amount);
    }

    @Test
    void aDriverOwingPastTheLimitIsListedAsBlocked() {
        owe(8000);
        var blocked = adminWallets.wallets("BLOCKED", "", 0, 100).items();
        assertThat(blocked).anySatisfy(wallet -> {
            assertThat(wallet.driverId()).isEqualTo(driverId);
            assertThat(wallet.balanceMinor()).isEqualTo(-8000);
            assertThat(wallet.blocked()).isTrue();
        });
        assertThat(adminWallets.entries(driverId)).isNotEmpty();
    }

    private long balance() {
        return ledger.balanceOf(LedgerAccountType.DRIVER, driverId, INR).amountMinor();
    }

    private void owe(long minor) {
        ledger.debit(LedgerAccountType.DRIVER, driverId, Money.of(minor, INR),
                "CASH_COLLECTED", "TEST", "test-" + System.nanoTime(), "test-" + System.nanoTime());
    }

    private void acceptedSecondsAgo(long seconds) {
        var ride = rideRequestRepository.findById(rideId).orElseThrow();
        ride.setAssignedAt(Instant.now().minusSeconds(seconds));
        rideRequestRepository.save(ride);
    }

    private void arrivedSecondsAgo(long seconds) {
        tripService.arrive(driverUserId, tripId);
        var trip = tripRepository.findById(tripId).orElseThrow();
        trip.setArrivedAt(Instant.now().minusSeconds(seconds));
        tripRepository.save(trip);
    }

    private String newApprovedDriver() {
        User user = userRepository.findById(newUser(UserRole.DRIVER)).orElseThrow();
        DriverProfile profile = driverProfileService.createFor(user);
        profile.setOnboardingStatus(DriverOnboardingStatus.APPROVED);
        profile.setOnDuty(true);
        driverProfileRepository.save(profile);
        return user.getId();
    }

    private String newUser(UserRole role) {
        User user = new User();
        user.setEmail("wallet-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user).getId();
    }
}
