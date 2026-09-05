package com.ridex.ride;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.maps.MapsService;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.pricing.FareEstimateRepository;
import com.ridex.pricing.FareEstimateService;
import com.ridex.pricing.domain.FareEstimate;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.ride.dto.CancelRideRequest;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.ride.dto.RideResponse;
import com.ridex.rider.RiderProfileService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;

@SpringBootTest
@Transactional
class RideRequestServiceTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);

    @MockitoBean private MapsService mapsProvider;

    @Autowired private RideRequestService rideRequestService;
    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private FareEstimateRepository fareEstimateRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RiderProfileService riderProfileService;

    private String riderId;
    private String otherRiderId;

    @BeforeEach
    void setUp() {
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins", null));
        riderId = newRider();
        otherRiderId = newRider();
    }

    @Test
    void aRideCarriesThePriceFromTheQuoteItWasBookedFrom() {
        var option = fareEstimateService.estimate(riderId, ROUTE).get(0);

        RideResponse ride = rideRequestService.create(riderId,
                new CreateRideRequest(option.estimateId(), "Koramangala", "Indiranagar", null, null));

        // The client sent no price and could not have.
        assertThat(ride.quotedFareMinor()).isEqualTo(option.totalMinor());
        assertThat(ride.status()).isEqualTo(RideStatus.SEARCHING);
        assertThat(ride.fareLines()).hasSameSizeAs(option.lines());
    }

    @Test
    void anExpiredQuoteCannotBeBooked() {
        var option = fareEstimateService.estimate(riderId, ROUTE).get(0);
        FareEstimate estimate = fareEstimateRepository.findById(option.estimateId()).orElseThrow();
        estimate.setExpiresAt(Instant.now().minusSeconds(1));
        fareEstimateRepository.save(estimate);

        // Re-quoting is the rider's choice, not something to do silently at a price they never saw.
        assertThatThrownBy(() -> rideRequestService.create(riderId,
                new CreateRideRequest(option.estimateId(), null, null, null, null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void oneQuoteBooksOneRide() {
        var option = fareEstimateService.estimate(riderId, ROUTE).get(0);
        rideRequestService.create(riderId, new CreateRideRequest(option.estimateId(), null, null, null, null));

        assertThatThrownBy(() -> rideRequestService.create(riderId,
                new CreateRideRequest(option.estimateId(), null, null, null, null)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void somebodyElsesQuoteIsNotBookable() {
        var option = fareEstimateService.estimate(otherRiderId, ROUTE).get(0);

        // Not found rather than forbidden: whether it exists is not the caller's business.
        assertThatThrownBy(() -> rideRequestService.create(riderId,
                new CreateRideRequest(option.estimateId(), null, null, null, null)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void cancellingWhileStillSearchingIsFree() {
        RideResponse ride = book(riderId);

        var quote = rideRequestService.quoteCancellation(riderId, ride.id());
        RideResponse cancelled = rideRequestService.cancel(riderId, ride.id(),
                new CancelRideRequest("Changed my mind"));

        // Nothing has been spent on the rider's behalf until a driver is on the way.
        assertThat(quote.free()).isTrue();
        assertThat(cancelled.status()).isEqualTo(RideStatus.CANCELLED_BY_RIDER);
        assertThat(cancelled.cancellationFeeMinor()).isZero();
        assertThat(cancelled.cancellationReason()).isEqualTo("Changed my mind");
    }

    @Test
    void aRideCannotBeCancelledTwice() {
        RideResponse ride = book(riderId);
        rideRequestService.cancel(riderId, ride.id(), new CancelRideRequest(null));

        assertThatThrownBy(() -> rideRequestService.cancel(riderId, ride.id(),
                new CancelRideRequest(null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already ended");
    }

    @Test
    void anotherRiderCanNeitherSeeNorCancelYourRide() {
        RideResponse ride = book(riderId);

        assertThatThrownBy(() -> rideRequestService.get(otherRiderId, ride.id()))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> rideRequestService.cancel(otherRiderId, ride.id(),
                new CancelRideRequest(null)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void theRiderSeesOnlyTheirOwnRides() {
        book(riderId);
        book(otherRiderId);

        List<RideResponse> mine = rideRequestService.list(riderId);

        assertThat(mine).hasSize(1);
    }

    private RideResponse book(String rider) {
        var option = fareEstimateService.estimate(rider, ROUTE).get(0);
        return rideRequestService.create(rider, new CreateRideRequest(option.estimateId(), null, null, null, null));
    }

    private String newRider() {
        User rider = new User();
        rider.setEmail("ride-" + System.nanoTime() + "@example.com");
        rider.setPasswordHash("irrelevant");
        rider.setStatus(UserStatus.ACTIVE);
        rider.setRoles(EnumSet.of(UserRole.RIDER));
        userRepository.save(rider);
        riderProfileService.createFor(rider);
        return rider.getId();
    }
}
