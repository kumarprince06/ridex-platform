package com.ridex.dispatch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.dispatch.domain.OfferStatus;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.DriverProfileService;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.location.DriverPresence;
import com.ridex.maps.MapsProvider;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.pricing.FareEstimateService;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.RideRequestService;
import com.ridex.ride.domain.RideStatus;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.rider.RiderProfileService;

@SpringBootTest
class DispatchSweepTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);

    @MockitoBean private MapsProvider mapsProvider;
    @MockitoBean private DriverPresence driverPresence;
    @MockitoBean private OfferNotifier offerNotifier;

    @Autowired private DispatchSweep dispatchSweep;
    @Autowired private RideRequestService rideRequestService;
    @Autowired private RideRequestRepository rideRequestRepository;
    @Autowired private RideOfferRepository rideOfferRepository;
    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;
    // The test class is not @Transactional on purpose, so a modifying query needs its own.
    @Autowired private org.springframework.transaction.support.TransactionTemplate transactions;

    private String riderUserId;

    @BeforeEach
    void setUp() {
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins"));
        riderUserId = newRider();
    }

    @Test
    void aRideNobodyAcceptsIsWidenedRatherThanLeftSearching() {
        when(driverPresence.nearby(anyDouble(), anyDouble(), anyDouble(), anyInt()))
                .thenReturn(List.of(newApprovedOnDutyDriverProfileId()));

        String rideId = book();
        expireEveryOfferFor(rideId);

        dispatchSweep.sweep();

        // Second wave, wider radius. Recorded on the ride, not inferred from offers: the only
        // nearby driver was already asked, so this wave writes no new offer and an inferred wave
        // would sit on 1 forever.
        var ride = rideRequestRepository.findById(rideId).orElseThrow();
        assertThat(ride.getSearchWave()).isEqualTo((short) 2);
        assertThat(ride.getStatus()).isEqualTo(RideStatus.SEARCHING);
    }

    @Test
    void aRideWithNobodyToOfferItToEventuallyExpires() {
        // Nobody on duty anywhere: the search cannot succeed and must not run forever.
        when(driverPresence.nearby(anyDouble(), anyDouble(), anyDouble(), anyInt()))
                .thenReturn(List.of());

        String rideId = book();
        ReflectionTestUtils.setField(dispatchSweep, "searchTimeoutSeconds", 0L);

        dispatchSweep.sweep();

        assertThat(rideRequestRepository.findById(rideId).orElseThrow().getStatus())
                .isEqualTo(RideStatus.EXPIRED);
        // The rider is told, rather than left watching a spinner.
        verify(offerNotifier).searchGaveUp(rideId);
    }

    @Test
    void aRideWithALiveOfferIsLeftAlone() {
        when(driverPresence.nearby(anyDouble(), anyDouble(), anyDouble(), anyInt()))
                .thenReturn(List.of(newApprovedOnDutyDriverProfileId()));

        String rideId = book();
        short waveBefore = rideRequestRepository.findById(rideId).orElseThrow().getSearchWave();

        dispatchSweep.sweep();

        // Somebody is still counting down; widening now would wake a second driver for nothing.
        assertThat(rideRequestRepository.findById(rideId).orElseThrow().getSearchWave())
                .isEqualTo(waveBefore);
    }

    /**
     * Ages the offers out by asking the sweep query to look from the future, rather than
     * backdating expires_at - which ck_ride_offers_window correctly refuses, since an offer that
     * expired before it was made is not a thing.
     */
    private void expireEveryOfferFor(String rideId) {
        Instant afterEverything = rideOfferRepository.findAll().stream()
                .filter(offer -> offer.getRideRequest().getId().equals(rideId))
                .map(offer -> offer.getExpiresAt())
                .max(Instant::compareTo)
                .orElseThrow()
                .plusSeconds(1);

        transactions.executeWithoutResult(status ->
                rideOfferRepository.expireOverdue(
                        afterEverything, OfferStatus.OFFERED, OfferStatus.EXPIRED));
    }

    private String book() {
        return rideRequestService.create(riderUserId, new CreateRideRequest(
                fareEstimateService.estimate(riderUserId, ROUTE).get(0).estimateId(), null, null)).id();
    }

    private String newRider() {
        User user = newUser(UserRole.RIDER);
        riderProfileService.createFor(user);
        return user.getId();
    }

    private String newApprovedOnDutyDriverProfileId() {
        User user = newUser(UserRole.DRIVER);
        DriverProfile profile = driverProfileService.createFor(user);
        profile.setOnboardingStatus(DriverOnboardingStatus.APPROVED);
        profile.setOnDuty(true);
        return driverProfileRepository.save(profile).getId();
    }

    private User newUser(UserRole role) {
        User user = new User();
        user.setEmail("sweep-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
