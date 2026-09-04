package com.ridex.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

import java.time.Instant;
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
import com.ridex.maps.MapsProvider;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.pricing.FareEstimateService;
import com.ridex.pricing.domain.FareLineType;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.ride.RideRequestService;
import com.ridex.ride.domain.RideStatus;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.trip.domain.Trip;
import com.ridex.trip.dto.CompleteTripRequest;
import com.ridex.trip.dto.StartTripRequest;

// Not @Transactional: dispatch runs in REQUIRES_NEW and cannot see a ride the test transaction
// never committed. The same reason DispatchConcurrencyTest commits its data.
@SpringBootTest
class TripLifecycleTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);

    @MockitoBean private MapsProvider mapsProvider;
    @MockitoBean private DriverPresence driverPresence;
    @MockitoBean private OfferNotifier offerNotifier;

    @Autowired private TripService tripService;
    @Autowired private TripRepository tripRepository;
    @Autowired private TripStatusHistoryRepository historyRepository;
    @Autowired private DispatchService dispatchService;
    @Autowired private RideRequestService rideRequestService;
    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    private String riderUserId;
    private String driverUserId;
    private String rideId;
    private String tripId;
    private String pickupCode;

    @BeforeEach
    void setUp() {
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins"));

        riderUserId = newRider();
        driverUserId = newApprovedOnDutyDriver();
        String driverProfileId = driverProfileRepository.findByUserId(driverUserId).orElseThrow().getId();
        when(driverPresence.nearby(anyDouble(), anyDouble(), anyDouble(), anyInt()))
                .thenReturn(List.of(driverProfileId));

        rideId = rideRequestService.create(riderUserId, new CreateRideRequest(
                fareEstimateService.estimate(riderUserId, ROUTE).get(0).estimateId(),
                "Koramangala", "Indiranagar")).id();

        dispatchService.offerRide(rideId, 1);
        String offerId = dispatchService.liveOffers(driverUserId).get(0).offerId();
        dispatchService.accept(driverUserId, offerId);

        Trip trip = tripRepository.findByRideRequestId(rideId).orElseThrow();
        tripId = trip.getId();
        // The raw code is returned once and never stored, so the test regenerates one the same way
        // the rider receives it.
        pickupCode = reissueKnownPickupCode(trip);
    }

    @Test
    void thePickupCodeIsRequiredToStartTheTrip() {
        tripService.arrive(driverUserId, tripId);

        assertThatThrownBy(() -> tripService.start(driverUserId, tripId,
                new StartTripRequest("000000")))
                .isInstanceOf(ConflictException.class);

        // A driver could otherwise start a trip nobody boarded, which is a fare.
        assertThat(tripRepository.findById(tripId).orElseThrow().getStartedAt()).isNull();
    }

    @Test
    void everyWrongCodeCountsAgainstTheCap() {
        tripService.arrive(driverUserId, tripId);

        for (int i = 0; i < Trip.MAX_PICKUP_CODE_ATTEMPTS; i++) {
            assertThatThrownBy(() -> tripService.start(driverUserId, tripId,
                    new StartTripRequest("000000"))).isInstanceOf(ConflictException.class);
        }

        // Even the right code now: five wrong guesses burn it, or the cap can be waited out.
        assertThatThrownBy(() -> tripService.start(driverUserId, tripId,
                new StartTripRequest(pickupCode)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Too many");
    }

    @Test
    void aFinishedTripProducesAReceiptComparingQuoteToCharge() {
        tripService.arrive(driverUserId, tripId);
        tripService.start(driverUserId, tripId, new StartTripRequest(pickupCode));
        // Longer than quoted: the driver rerouted.
        tripService.complete(driverUserId, tripId, new CompleteTripRequest(8900, 1560));

        var receipt = tripService.receipt(rideId);

        assertThat(receipt.quotedDistanceMeters()).isEqualTo(8200);
        assertThat(receipt.actualDistanceMeters()).isEqualTo(8900);
        assertThat(receipt.chargedTotalMinor()).isGreaterThan(receipt.quotedTotalMinor());
        assertThat(receipt.differenceMinor())
                .isEqualTo(receipt.chargedTotalMinor() - receipt.quotedTotalMinor());

        // Both sides are lines, in the same shape, so they can be shown side by side.
        assertThat(receipt.quotedLines()).isNotEmpty();
        assertThat(receipt.chargedLines()).isNotEmpty();
        long summed = receipt.chargedLines().stream().mapToLong(line -> line.amountMinor()).sum();
        assertThat(summed).isEqualTo(receipt.chargedTotalMinor());
    }

    @Test
    void anImplausibleDistanceIsCappedRatherThanCharged() {
        tripService.arrive(driverUserId, tripId);
        tripService.start(driverUserId, tripId, new StartTripRequest(pickupCode));

        // A broken odometer reporting 500 km on an 8 km quote must not price the ride.
        tripService.complete(driverUserId, tripId, new CompleteTripRequest(500_000, 1560));

        assertThat(tripRepository.findById(tripId).orElseThrow().getActualDistanceMeters())
                .isEqualTo(16_400);
    }

    @Test
    void waitingAtPickupIsChargedFromTheServersArrivalTime() {
        tripService.arrive(driverUserId, tripId);

        Trip trip = tripRepository.findById(tripId).orElseThrow();
        // Nine minutes ago: five free, four chargeable.
        trip.setArrivedAt(Instant.now().minusSeconds(540));
        tripRepository.save(trip);

        tripService.start(driverUserId, tripId, new StartTripRequest(pickupCode));
        tripService.complete(driverUserId, tripId, new CompleteTripRequest(8200, 1080));

        // Read through the receipt: the entity's lines are lazy, and there is no session here.
        assertThat(tripService.receipt(rideId).chargedLines())
                .extracting(line -> line.type())
                .contains(FareLineType.WAITING);
    }

    @Test
    void everyTransitionIsRecordedWithItsActor() {
        tripService.arrive(driverUserId, tripId);
        tripService.start(driverUserId, tripId, new StartTripRequest(pickupCode));
        tripService.complete(driverUserId, tripId, new CompleteTripRequest(8200, 1080));

        // A status column can say where a ride is; only this can say when it got there and who
        // moved it, which is what a dispute needs.
        assertThat(historyRepository.findByTripIdOrderByOccurredAtAsc(tripId))
                .extracting(h -> h.getToStatus())
                .containsSubsequence(RideStatus.DRIVER_AT_PICKUP, RideStatus.TRIP_STARTED,
                        RideStatus.COMPLETED);
    }

    /** Replaces the hash with a code this test knows, since the real one is returned only once. */
    private String reissueKnownPickupCode(Trip trip) {
        String code = "418302";
        trip.setPickupCodeHash(
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4).encode(code));
        tripRepository.save(trip);
        return code;
    }

    private String newRider() {
        User user = newUser(UserRole.RIDER);
        riderProfileService.createFor(user);
        return user.getId();
    }

    private String newApprovedOnDutyDriver() {
        User user = newUser(UserRole.DRIVER);
        DriverProfile profile = driverProfileService.createFor(user);
        profile.setOnboardingStatus(DriverOnboardingStatus.APPROVED);
        profile.setOnDuty(true);
        driverProfileRepository.save(profile);
        return user.getId();
    }

    private User newUser(UserRole role) {
        User user = new User();
        user.setEmail("trip-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
