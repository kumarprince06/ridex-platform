package com.ridex.rating;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

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
import com.ridex.pricing.FareEstimateService;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.rating.dto.RateRideRequest;
import com.ridex.ride.RideRequestService;
import com.ridex.ride.domain.CancellationReason;
import com.ridex.ride.domain.RideStatus;
import com.ridex.ride.dto.CancelRideRequest;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.trip.TripRepository;
import com.ridex.trip.TripService;
import com.ridex.trip.dto.CompleteTripRequest;
import com.ridex.trip.dto.StartTripRequest;

// Not @Transactional: dispatch runs in REQUIRES_NEW and cannot see a ride the test never committed.
@SpringBootTest
class TwoWayRatingTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);

    @MockitoBean private MapsService mapsProvider;
    @MockitoBean private DriverPresence driverPresence;
    @MockitoBean private OfferNotifier offerNotifier;

    @Autowired private RatingService ratingService;
    @Autowired private RideRatingRepository rideRatingRepository;
    @Autowired private TripService tripService;
    @Autowired private TripRepository tripRepository;
    @Autowired private DispatchService dispatchService;
    @Autowired private RideRequestService rideRequestService;
    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private RiderProfileRepository riderProfileRepository;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    private String riderUserId;
    private String driverUserId;
    private String rideId;
    private String tripId;

    @BeforeEach
    void setUp() {
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins", null));

        riderUserId = newRider();
        driverUserId = newApprovedDriver();
        when(driverPresence.nearby(anyDouble(), anyDouble(), anyDouble(), anyInt()))
                .thenReturn(List.of(driverProfileRepository.findByUserId(driverUserId).orElseThrow().getId()));

        rideId = rideRequestService.create(riderUserId, new CreateRideRequest(
                fareEstimateService.estimate(riderUserId, ROUTE).get(0).estimateId(),
                "Koramangala", "Indiranagar", null, null)).id();

        dispatchService.offerRide(rideId, 1);
        tripId = dispatchService.accept(driverUserId,
                dispatchService.liveOffers(driverUserId).get(0).offerId()).tripId();
    }

    @Test
    void aDriverCancellationEndsTheRideWithItsReason() {
        rideRequestService.cancelAsDriver(driverUserId, rideId,
                new CancelRideRequest(CancellationReason.RIDER_NOT_AT_PICKUP, null));

        var ride = rideRequestService.get(riderUserId, rideId);
        assertThat(ride.status()).isEqualTo(RideStatus.CANCELLED_BY_DRIVER);
        // The rider is told why, rather than left watching a car that is not coming.
        assertThat(ride.cancellationReason()).isEqualTo("Rider is not at the pickup");
        // And is not billed for a cancellation they did not make.
        assertThat(ride.cancellationFeeMinor()).isZero();
    }

    @Test
    void aDriverCannotGiveTheRidersReasons() {
        assertThatThrownBy(() -> rideRequestService.cancelAsDriver(driverUserId, rideId,
                new CancelRideRequest(CancellationReason.DRIVER_TOO_FAR, null)))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void bothSidesOfARideLandOnOneRow() {
        completeTheTrip();

        ratingService.rate(riderUserId, rideId, new RateRideRequest(5, "Smooth drive"));
        ratingService.rateRider(driverUserId, rideId, new RateRideRequest(4, "On time"));

        var rating = rideRatingRepository.findByRideId(rideId).orElseThrow();
        assertThat(rating.getStars()).isEqualTo((short) 5);
        assertThat(rating.getRiderStars()).isEqualTo((short) 4);

        // And each average moves on its own side.
        assertThat(driverProfileRepository.findByUserId(driverUserId).orElseThrow().getRating())
                .isNotNull();
        assertThat(riderProfileRepository.findByUserId(riderUserId).orElseThrow().getRatingCount())
                .isEqualTo(1);
    }

    @Test
    void aDriverRatesARiderOnce() {
        completeTheTrip();
        ratingService.rateRider(driverUserId, rideId, new RateRideRequest(4, null));

        assertThatThrownBy(() -> ratingService.rateRider(driverUserId, rideId,
                new RateRideRequest(1, "changed my mind")))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void theDriversHistoryCarriesWhatTheyEarned() {
        completeTheTrip();

        assertThat(tripService.history(driverUserId))
                .filteredOn(summary -> summary.tripId().equals(tripId))
                .singleElement()
                .satisfies(summary -> {
                    assertThat(summary.status()).isEqualTo(RideStatus.COMPLETED);
                    assertThat(summary.riderName()).isNotBlank();
                    // The driver's cut, never the fare: the two differ by the commission.
                    assertThat(summary.earnedMinor()).isNotNull();
                    assertThat(summary.earnedMinor()).isLessThan(summary.fareMinor());
                });
    }

    private void completeTheTrip() {
        var trip = tripRepository.findById(tripId).orElseThrow();
        tripService.arrive(driverUserId, tripId);
        tripService.start(driverUserId, tripId, new StartTripRequest(trip.getPickupCode()));
        tripService.complete(driverUserId, tripId, new CompleteTripRequest(8200, 1080));
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
        user.setEmail("rating-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
