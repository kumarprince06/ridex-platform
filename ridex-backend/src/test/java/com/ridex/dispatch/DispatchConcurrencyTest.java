package com.ridex.dispatch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

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
import com.ridex.shared.exception.ConflictException;

/**
 * The race that happens at every rush hour: two drivers tap Accept on the same offer at the same
 * moment. Exactly one must win, and the other must be told plainly.
 *
 * <p>Not @Transactional: the threads need to see each other's committed work, which a rolled-back
 * test transaction would hide - and hiding it is precisely how this bug reaches production.
 */
@SpringBootTest
class DispatchConcurrencyTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);

    @MockitoBean private MapsProvider mapsProvider;
    @MockitoBean private DriverPresence driverPresence;
    @MockitoBean private OfferNotifier offerNotifier;

    @Autowired private DispatchService dispatchService;
    @Autowired private RideRequestService rideRequestService;
    @Autowired private RideRequestRepository rideRequestRepository;
    @Autowired private RideOfferRepository rideOfferRepository;
    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    private String riderUserId;
    private final List<String> driverUserIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins"));

        riderUserId = newRider();
        driverUserIds.clear();

        List<String> driverProfileIds = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            String userId = newApprovedOnDutyDriver();
            driverUserIds.add(userId);
            driverProfileIds.add(driverProfileRepository.findByUserId(userId).orElseThrow().getId());
        }

        when(driverPresence.nearby(anyDouble(), anyDouble(), anyDouble(), anyInt()))
                .thenReturn(driverProfileIds);
    }

    @Test
    void twoDriversAcceptingTheSameRideProduceOneWinnerAndOneConflict() throws Exception {
        String rideId = rideRequestService.create(riderUserId, new CreateRideRequest(
                fareEstimateService.estimate(riderUserId, ROUTE).get(0).estimateId(), null, null, null)).id();

        List<String> offerIds = new ArrayList<>();
        for (String driverUserId : driverUserIds) {
            offerIds.add(dispatchService.liveOffers(driverUserId).get(0).offerId());
        }
        assertThat(offerIds).hasSize(2);

        AtomicInteger accepted = new AtomicInteger();
        AtomicInteger conflicted = new AtomicInteger();
        // Collected, not thrown: submit() buries an exception in the Future, so a real failure
        // would show up only as a wrong count with no clue why.
        List<Throwable> unexpected = java.util.Collections.synchronizedList(new ArrayList<>());
        CountDownLatch startTogether = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        for (int i = 0; i < 2; i++) {
            String driverUserId = driverUserIds.get(i);
            String offerId = offerIds.get(i);
            pool.submit(() -> {
                try {
                    startTogether.await();
                    dispatchService.accept(driverUserId, offerId);
                    accepted.incrementAndGet();
                } catch (ConflictException expected) {
                    conflicted.incrementAndGet();
                } catch (Throwable other) {
                    unexpected.add(other);
                }
            });
        }

        startTogether.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(20, TimeUnit.SECONDS)).isTrue();
        assertThat(unexpected).as("neither driver should hit anything but a clean conflict").isEmpty();

        assertThat(accepted.get()).as("winners").isEqualTo(1);
        assertThat(conflicted.get()).as("losers told plainly").isEqualTo(1);

        // One driver on the ride, and one accepted offer. Not two of either.
        var ride = rideRequestRepository.findById(rideId).orElseThrow();
        assertThat(ride.getStatus()).isEqualTo(RideStatus.DRIVER_ASSIGNED);
        assertThat(ride.getAssignedDriverId()).isNotNull();
        assertThat(ride.getAssignedAt()).isNotNull();

        long acceptedOffers = rideOfferRepository.findAll().stream()
                .filter(offer -> offer.getRideRequest().getId().equals(rideId))
                .filter(offer -> offer.getStatus() == OfferStatus.ACCEPTED)
                .count();
        assertThat(acceptedOffers).isEqualTo(1);
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
        user.setEmail("dispatch-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
