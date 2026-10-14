package com.ridex.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.EnumSet;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.ridex.IntegrationTest;
import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.dispatch.DispatchService;
import com.ridex.dispatch.DriverDutyService;
import com.ridex.dispatch.DriverLocationSocket;
import com.ridex.dispatch.OfferNotifier;
import com.ridex.dispatch.dto.LocationRequest;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.DriverProfileService;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.location.DriverPresence;
import com.ridex.maps.MapsService;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.pricing.FareEstimateService;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.ride.RideRequestService;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.rider.RiderProfileService;

/** The car's position reaches the rider of that trip, and nobody else can listen in. */
@IntegrationTest
class TripLocationTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);

    @MockitoBean private MapsService mapsProvider;
    @MockitoBean private DriverPresence driverPresence;
    @MockitoBean private OfferNotifier offerNotifier;
    @MockitoBean private SimpMessagingTemplate messaging;

    @Autowired private DriverDutyService driverDutyService;
    @Autowired private DriverLocationSocket driverLocationSocket;
    @Autowired private TripTopicGuard tripTopicGuard;
    @Autowired private DispatchService dispatchService;
    @Autowired private TripRepository tripRepository;
    @Autowired private RideRequestService rideRequestService;
    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    private String riderUserId;
    private String driverUserId;

    @BeforeEach
    void setUp() {
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins", null));
        riderUserId = newRider();
        driverUserId = newApprovedOnDutyDriver();
        String driverProfileId = driverProfileRepository.findByUserId(driverUserId).orElseThrow().getId();
        when(driverPresence.nearby(anyDouble(), anyDouble(), anyDouble(), anyInt()))
                .thenReturn(List.of(driverProfileId));
    }

    @Test
    void aPingDuringATripReachesThatTripsTopic() {
        String tripId = acceptedTrip();

        driverDutyService.reportLocation(driverUserId, new LocationRequest(12.9360, 77.6250));

        var sent = ArgumentCaptor.forClass(Object.class);
        verify(messaging).convertAndSend(eq("/topic/trips/" + tripId + "/location"), sent.capture());
        var location = (TripLocationBroadcaster.TripLocation) sent.getValue();
        assertThat(location.tripId()).isEqualTo(tripId);
        assertThat(location.latitude()).isEqualTo(12.9360);
        assertThat(location.longitude()).isEqualTo(77.6250);
        assertThat(location.at()).isNotNull();
    }

    @Test
    void aPingWithNoTripIsNotBroadcast() {
        driverDutyService.reportLocation(driverUserId, new LocationRequest(12.9360, 77.6250));

        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void aSocketPingIsTheSameAsAnHttpOne() {
        String tripId = acceptedTrip();

        driverLocationSocket.report(new LocationRequest(12.9360, 77.6250), principalOf(driverUserId, UserRole.DRIVER));

        verify(messaging).convertAndSend(eq("/topic/trips/" + tripId + "/location"), any(Object.class));
    }

    @Test
    void aRiderCannotReportALocationOverTheSocket() {
        assertThatThrownBy(() -> driverLocationSocket.report(
                new LocationRequest(12.9360, 77.6250), principalOf(riderUserId, UserRole.RIDER)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void onlyTheTripsRiderAndDriverCanFollowIt() {
        String topic = "/topic/trips/" + acceptedTrip() + "/location";

        assertThat(tripTopicGuard.allows(riderUserId, topic)).isTrue();
        assertThat(tripTopicGuard.allows(driverUserId, topic)).isTrue();
        assertThat(tripTopicGuard.allows(newRider(), topic)).isFalse();
        // Anything else under the prefix is guarded too, and other topics are not this guard's.
        assertThat(tripTopicGuard.allows(newRider(), "/topic/trips/nope/location")).isFalse();
        assertThat(tripTopicGuard.allows(riderUserId, "/topic/shuttle-trips/x")).isNull();
    }

    private String acceptedTrip() {
        String rideId = rideRequestService.create(riderUserId, new CreateRideRequest(
                fareEstimateService.estimate(riderUserId, ROUTE).get(0).estimateId(), null, null, null, null)).id();
        dispatchService.accept(driverUserId, dispatchService.liveOffers(driverUserId).get(0).offerId());
        return tripRepository.findByRideRequestId(rideId).orElseThrow().getId();
    }

    private static org.springframework.security.core.Authentication principalOf(String userId, UserRole role) {
        return new JwtPrincipal(userId, "x@example.com", EnumSet.of(role), null).toAuthentication();
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
        user.setEmail("trip-location-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
