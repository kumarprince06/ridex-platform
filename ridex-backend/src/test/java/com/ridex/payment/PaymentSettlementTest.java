package com.ridex.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

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
import com.ridex.payment.domain.LedgerAccountType;
import com.ridex.points.PointsService;
import com.ridex.pricing.FareEstimateService;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.ride.RideRequestService;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.rider.RiderProfileService;
import com.ridex.trip.TripRepository;
import com.ridex.trip.TripService;
import com.ridex.trip.dto.CompleteTripRequest;
import com.ridex.trip.dto.StartTripRequest;

/**
 * The rule this file exists for: <b>a rider's discount comes out of the platform's share, never
 * the driver's.</b> Drivers notice when it does not, and they are right to.
 */
@SpringBootTest
class PaymentSettlementTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);
    private static final Currency INR = Currency.getInstance("INR");

    @MockitoBean private MapsService mapsProvider;
    @MockitoBean private DriverPresence driverPresence;
    @MockitoBean private OfferNotifier offerNotifier;

    @Autowired private PaymentService paymentService;
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

    @BeforeEach
    void setUp() {
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins"));

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
    void settlingTheSameTripTwiceDoesNotChargeTwice() {
        String tripId = runTripToCompletion(book(0));

        // Completion already settled it; a retry must return the same payment, not make another.
        paymentService.settleTrip(tripId, 0, com.ridex.payment.domain.PaymentMethod.CASH);

        assertThat(paymentRepository.findAll().stream()
                .filter(payment -> payment.getTrip().getId().equals(tripId))
                .count()).isEqualTo(1);
    }

    private void giveRiderPoints(int points) {
        for (int i = 0; i < points / 20; i++) {
            pointsService.awardForCompletedRide(riderUserId, "seed-" + System.nanoTime());
        }
    }

    private String book(int redeemPoints) {
        return rideRequestService.create(riderUserId, new CreateRideRequest(
                fareEstimateService.estimate(riderUserId, ROUTE).get(0).estimateId(),
                "Koramangala", "Indiranagar", redeemPoints, null)).id();
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
