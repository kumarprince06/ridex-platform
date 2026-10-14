package com.ridex.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Currency;
import java.util.EnumSet;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.ridex.IntegrationTest;
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
import com.ridex.payment.domain.LedgerAccountType;
import com.ridex.payment.domain.Payment;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.payment.domain.PaymentStatus;
import com.ridex.points.PointsService;
import com.ridex.pricing.FareEstimateService;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.ride.RideRequestService;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ProviderUnavailableException;
import com.ridex.trip.TripRepository;
import com.ridex.trip.TripService;
import com.ridex.trip.dto.CompleteTripRequest;
import com.ridex.trip.dto.StartTripRequest;

/**
 * The rule this file exists for: <b>a rider's discount comes out of the platform's share, never
 * the driver's.</b> Drivers notice when it does not, and they are right to.
 */
@IntegrationTest
class PaymentSettlementTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);
    private static final Currency INR = Currency.getInstance("INR");

    @MockitoBean private MapsService mapsProvider;
    @MockitoBean private DriverPresence driverPresence;
    @MockitoBean private OfferNotifier offerNotifier;
    // The online gateway, stubbed: the build has no Razorpay keys. Cash stays the real provider.
    @MockitoBean private PaymentProviders paymentProviders;
    @Autowired private CashPaymentProvider cashProvider;

    @Autowired private PaymentService paymentService;
    @Autowired private PaymentOrderWorker paymentOrderWorker;
    @Autowired private io.micrometer.core.instrument.MeterRegistry meterRegistry;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private DriverEarningRepository driverEarningRepository;
    @Autowired private LedgerService ledger;
    @Autowired private PointsService pointsService;
    @Autowired private TripService tripService;
    @Autowired private TripRepository tripRepository;
    @Autowired private DispatchService dispatchService;
    @Autowired private RideRequestService rideRequestService;
    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    private String riderUserId;
    private String driverUserId;
    private String driverProfileId;
    private PaymentProvider gateway;

    @BeforeEach
    void setUp() {
        gateway = mock(PaymentProvider.class);
        when(gateway.name()).thenReturn("RAZORPAY");
        when(gateway.createPaymentIntent(any(), anyString(), anyString()))
                .thenAnswer(call -> new PaymentProvider.ProviderPayment(
                        "order_" + call.getArgument(1), "REQUIRES_ACTION", null));
        when(paymentProviders.forMethod(any())).thenAnswer(call ->
                call.getArgument(0) == PaymentMethod.CASH ? cashProvider : gateway);

        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins", null));

        riderUserId = newRider();
        driverUserId = newApprovedDriver();
        driverProfileId = driverProfileRepository.findByUserId(driverUserId).orElseThrow().getId();
        when(driverPresence.nearby(anyDouble(), anyDouble(), anyDouble(), anyInt()))
                .thenReturn(List.of(driverProfileId));
    }

    @Test
    void theDriverIsPaidOnTheGrossFareEvenWhenTheRiderRedeemsPoints() {
        // 500 points, worth five rupees at the seeded rate.
        giveRiderPoints(500);

        String rideId = book(500);
        String tripId = runTripToCompletion(rideId);

        var payment = paymentRepository.findByTripId(tripId).orElseThrow();
        var earning = driverEarningRepository.findByTripId(tripId).orElseThrow();

        assertThat(payment.getDiscountAmountMinor()).isEqualTo(500);
        assertThat(payment.getNetAmountMinor())
                .isEqualTo(payment.getGrossAmountMinor() - 500);

        // The whole point: commission and net are computed on gross, so the rider's points cost
        // the platform and not the driver.
        assertThat(earning.getGrossAmountMinor()).isEqualTo(payment.getGrossAmountMinor());
        assertThat(earning.getCommissionMinor() + earning.getNetAmountMinor())
                .isEqualTo(earning.getGrossAmountMinor());
    }

    @Test
    void aDiscountedRideEarnsTheDriverExactlyWhatAnUndiscountedOneWould() {
        giveRiderPoints(500);
        String withPoints = runTripToCompletion(book(500));

        String otherRider = newRider();
        riderUserId = otherRider;
        String withoutPoints = runTripToCompletion(book(0));

        long discounted = driverEarningRepository.findByTripId(withPoints).orElseThrow().getNetAmountMinor();
        long plain = driverEarningRepository.findByTripId(withoutPoints).orElseThrow().getNetAmountMinor();

        assertThat(discounted).isEqualTo(plain);
    }

    @Test
    void theLedgerRecordsTheDiscountAgainstThePlatform() {
        giveRiderPoints(500);

        // The platform account is global and accumulates across every trip ever settled, so the
        // measurement has to be a delta rather than an absolute.
        long before = ledger.balanceOf(LedgerAccountType.PLATFORM, null, INR).amountMinor();
        String tripId = runTripToCompletion(book(500));
        long after = ledger.balanceOf(LedgerAccountType.PLATFORM, null, INR).amountMinor();

        var earning = driverEarningRepository.findByTripId(tripId).orElseThrow();

        // Platform keeps commission and pays for the discount out of it, so its position moves by
        // commission minus discount.
        assertThat(after - before).isEqualTo(earning.getCommissionMinor() - 500);
    }

    @Test
    void anOnlineRideIsOwedUntilTheGatewayClears() {
        String rideId = book(0, PaymentMethod.UPI);
        runTripToCompletion(rideId);

        // A taxi fare is priced from the distance driven, so the charge only exists now - and the
        // rider's app needs the gateway order to settle it.
        var owed = paymentService.forRider(riderUserId, rideId);
        assertThat(owed.method()).isEqualTo(PaymentMethod.UPI);
        assertThat(owed.settled()).isFalse();
        assertThat(owed.amountMinor()).isPositive();
        // Opened the moment the trip committed, not one poll later.
        assertThat(owed.gatewayOrderId()).isNotNull();
    }

    @Test
    void aGatewayOutageAtCompletionStillEndsTheTripAndQueuesThePayment() {
        gatewayIsDown();
        String tripId = runTripToCompletion(book(0, PaymentMethod.UPI));

        // The driver could end the trip: the outage cost a retry, not the completion.
        assertThat(tripRepository.findById(tripId).orElseThrow().getCompletedAt()).isNotNull();

        Payment payment = paymentRepository.findByTripId(tripId).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CREATED);
        assertThat(payment.getProviderPaymentId()).isNull();
        assertThat(payment.getAttempts()).isEqualTo((short) 1);
        assertThat(payment.getLastError()).contains("timed out");
        assertThat(payment.getNextAttemptAt()).isAfter(Instant.now());
    }

    @Test
    void aQueuedOrderOpensOnceTheGatewayRecovers() {
        gatewayIsDown();
        String tripId = runTripToCompletion(book(0, PaymentMethod.UPI));
        gatewayIsUp(0);
        makeDue(tripId, 1);

        paymentOrderWorker.drain();

        Payment payment = paymentRepository.findByTripId(tripId).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PROCESSING);
        assertThat(payment.getProviderPaymentId()).isEqualTo("order_" + tripId);
        assertThat(payment.getNextAttemptAt()).isNull();
        assertThat(payment.getLastError()).isNull();
    }

    @Test
    void thePendingQueueGaugeFollowsTheOutboxRows() {
        gatewayIsDown();
        String tripId = runTripToCompletion(book(0, PaymentMethod.UPI));

        // Other tests leave their own rows, so this checks movement rather than a total.
        double queued = pendingGauge();
        assertThat(queued).isGreaterThanOrEqualTo(1);

        gatewayIsUp(0);
        makeDue(tripId, 1);
        paymentOrderWorker.drain();

        assertThat(pendingGauge()).isLessThanOrEqualTo(queued - 1);
    }

    @Test
    void aPaymentGivesUpAfterItsLastAttempt() {
        gatewayIsDown();
        String tripId = runTripToCompletion(book(0, PaymentMethod.UPI));
        makeDue(tripId, PaymentOrderWorker.MAX_ATTEMPTS - 1);

        paymentOrderWorker.drain();

        // Failed, not deleted: the rider still owes the fare, and somebody has to see that.
        Payment payment = paymentRepository.findByTripId(tripId).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(payment.getAttempts()).isEqualTo(PaymentOrderWorker.MAX_ATTEMPTS);
        assertThat(payment.getFailureReason()).contains("timed out");
        assertThat(payment.getNextAttemptAt()).isNull();
    }

    @Test
    void twoWorkersDrainingAtOnceOpenTheOrderOnce() throws Exception {
        gatewayIsDown();
        String tripId = runTripToCompletion(book(0, PaymentMethod.UPI));
        // Slow enough that the second worker arrives while the first still holds the row.
        gatewayIsUp(300);
        makeDue(tripId, 1);

        CountDownLatch startTogether = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<Integer>> drains = List.of(
                    pool.submit(() -> { startTogether.await(); return paymentOrderWorker.drain(); }),
                    pool.submit(() -> { startTogether.await(); return paymentOrderWorker.drain(); }));
            startTogether.countDown();
            for (Future<Integer> drain : drains) {
                drain.get(20, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        // Once when the trip completed (the outage), once by whichever worker claimed the row.
        verify(gateway, times(2)).createPaymentIntent(any(), eq(tripId), anyString());
        assertThat(paymentRepository.findByTripId(tripId).orElseThrow().getStatus())
                .isEqualTo(PaymentStatus.PROCESSING);
    }

    @Test
    void aCashRideIsSettledTheMomentItEnds() {
        String rideId = book(0, PaymentMethod.CASH);
        runTripToCompletion(rideId);

        // The driver was handed the money in the car: there is nothing for the app to open.
        var owed = paymentService.forRider(riderUserId, rideId);
        assertThat(owed.settled()).isTrue();
        assertThat(owed.gatewayOrderId()).isNull();
    }

    @Test
    void settlingTheSameTripTwiceDoesNotChargeTwice() {
        String tripId = runTripToCompletion(book(0));

        // Completion already settled it; a retry must return the same payment, not make another.
        paymentService.settleTrip(tripId, 0, com.ridex.payment.domain.PaymentMethod.CASH);

        assertThat(paymentRepository.findAll().stream()
                // Shuttle seats are payments with no trip, and this scans every payment in the
                // database - including any another test left behind.
                .filter(payment -> payment.getTrip() != null)
                .filter(payment -> payment.getTrip().getId().equals(tripId))
                .count()).isEqualTo(1);
    }

    private void gatewayIsDown() {
        doThrow(new ProviderUnavailableException("Razorpay timed out"))
                .when(gateway).createPaymentIntent(any(), anyString(), anyString());
    }

    private void gatewayIsUp(long latencyMillis) {
        doAnswer(call -> {
            Thread.sleep(latencyMillis);
            return new PaymentProvider.ProviderPayment("order_" + call.getArgument(1), "REQUIRES_ACTION", null);
        }).when(gateway).createPaymentIntent(any(), anyString(), anyString());
    }

    private double pendingGauge() {
        return meterRegistry.get("ridex.payments.orders.pending").gauge().value();
    }

    // Backdates the retry rather than waiting out the backoff.
    private void makeDue(String tripId, int attempts) {
        Payment payment = paymentRepository.findByTripId(tripId).orElseThrow();
        payment.setAttempts((short) attempts);
        payment.setNextAttemptAt(Instant.now().minusSeconds(1));
        paymentRepository.save(payment);
    }

    private void giveRiderPoints(int points) {
        for (int i = 0; i < points / 20; i++) {
            pointsService.awardForCompletedRide(riderUserId, "seed-" + System.nanoTime());
        }
    }

    private String book(int redeemPoints) {
        return book(redeemPoints, null);
    }

    private String book(int redeemPoints, PaymentMethod method) {
        return rideRequestService.create(riderUserId, new CreateRideRequest(
                fareEstimateService.estimate(riderUserId, ROUTE).get(0).estimateId(),
                "Koramangala", "Indiranagar", redeemPoints, method)).id();
    }

    private String runTripToCompletion(String rideId) {
        dispatchService.offerRide(rideId, 1);
        dispatchService.accept(driverUserId, dispatchService.liveOffers(driverUserId).get(0).offerId());

        var trip = tripRepository.findByRideRequestId(rideId).orElseThrow();
        trip.setPickupCodeHash(
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4).encode("418302"));
        tripRepository.save(trip);

        tripService.arrive(driverUserId, trip.getId());
        tripService.start(driverUserId, trip.getId(), new StartTripRequest("418302"));
        tripService.complete(driverUserId, trip.getId(), new CompleteTripRequest(8200, 1080));
        return trip.getId();
    }

    private String newRider() {
        User user = newUser(UserRole.RIDER);
        riderProfileService.createFor(user);
        return user.getId();
    }

    private String newApprovedDriver() {
        User user = newUser(UserRole.DRIVER);
        DriverProfile profile = driverProfileService.createFor(user);
        profile.setOnboardingStatus(DriverOnboardingStatus.APPROVED);
        profile.setOnDuty(true);
        driverProfileRepository.save(profile);
        return user.getId();
    }

    private User newUser(UserRole role) {
        User user = new User();
        user.setEmail("pay-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
