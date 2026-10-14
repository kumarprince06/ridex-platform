package com.ridex.dispatch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

import com.ridex.IntegrationTest;
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
import com.ridex.maps.MapsService;
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
 * A driver taps Accept in the same instant the sweep expires their offer. Whichever wins, the
 * database must agree with itself: a ride is assigned only to a driver whose offer was accepted.
 *
 * <p>Not @Transactional, for the same reason as DispatchConcurrencyTest: each side has to see the
 * other's committed work.
 */
@IntegrationTest
class DispatchExpiryRaceTest {

    private static final EstimateRequest ROUTE = new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);

    @MockitoBean private MapsService mapsProvider;
    @MockitoBean private DriverPresence driverPresence;
    @MockitoBean private OfferNotifier offerNotifier;

    @Autowired private DispatchService dispatchService;
    @Autowired private DispatchSweep dispatchSweep;
    @Autowired private RideRequestService rideRequestService;
    @Autowired private RideRequestRepository rideRequestRepository;
    @Autowired private RideOfferRepository rideOfferRepository;
    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;
    @Autowired private TransactionTemplate transactions;
    @Autowired private JdbcTemplate jdbc;

    private final ExecutorService pool = Executors.newFixedThreadPool(2);

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

    @AfterEach
    void tearDown() {
        pool.shutdownNow();
    }

    /**
     * The interleaving that used to slip through, forced rather than hoped for: the accept reads a
     * live offer, then queues on the ride while the sweep expires that offer and commits.
     */
    @Test
    void anOfferThatExpiresWhileTheAcceptWaitsOnTheRideIsRefused() throws Exception {
        String rideId = book();
        String offerId = dispatchService.liveOffers(driverUserId).get(0).offerId();

        CountDownLatch rideLocked = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);

        // The sweep's own lock order at the deadline: the ride first, then its offers.
        Future<?> sweep = pool.submit(() -> transactions.executeWithoutResult(status -> {
            jdbc.queryForObject(
                    "SELECT id FROM ride_requests WHERE id = ? FOR NO KEY UPDATE", String.class, rideId);
            jdbc.update("UPDATE ride_offers SET status = 'EXPIRED' WHERE id = ?", offerId);
            rideLocked.countDown();
            awaitQuietly(release);
        }));
        assertThat(rideLocked.await(10, TimeUnit.SECONDS)).isTrue();

        Future<Throwable> accept = pool.submit(() -> acceptCatching(offerId));
        awaitSomebodyBlockedOnALock();
        release.countDown();

        sweep.get(10, TimeUnit.SECONDS);
        assertThat(accept.get(10, TimeUnit.SECONDS)).isInstanceOf(ConflictException.class);

        var ride = rideRequestRepository.findById(rideId).orElseThrow();
        assertThat(ride.getStatus()).isEqualTo(RideStatus.SEARCHING);
        assertThat(ride.getAssignedDriverId()).isNull();
        assertThat(rideOfferRepository.findById(offerId).orElseThrow().getStatus())
                .isEqualTo(OfferStatus.EXPIRED);
    }

    /** The real sweep against the real accept, started together at the deadline. */
    @RepeatedTest(10)
    void anAcceptAndTheSweepAtTheDeadlineNeverDisagree() throws Exception {
        String rideId = book();
        String offerId = dispatchService.liveOffers(driverUserId).get(0).offerId();
        Instant deadline = rideOfferRepository.findById(offerId).orElseThrow().getExpiresAt();

        CountDownLatch startTogether = new CountDownLatch(1);
        Future<Throwable> accept = pool.submit(() -> {
            startTogether.await();
            return acceptCatching(offerId);
        });
        Future<?> sweep = pool.submit(() -> {
            awaitQuietly(startTogether);
            dispatchSweep.sweepRide(rideId, deadline);
        });

        startTogether.countDown();
        sweep.get(10, TimeUnit.SECONDS);
        Throwable acceptOutcome = accept.get(10, TimeUnit.SECONDS);

        var ride = rideRequestRepository.findById(rideId).orElseThrow();
        var offer = rideOfferRepository.findById(offerId).orElseThrow();

        if (ride.getStatus() == RideStatus.DRIVER_ASSIGNED) {
            // The driver won: their offer says so, and the sweep left it alone.
            assertThat(acceptOutcome).isNull();
            assertThat(offer.getStatus()).isEqualTo(OfferStatus.ACCEPTED);
        } else {
            // The sweep won: the driver was told plainly and the ride is still looking.
            assertThat(acceptOutcome).isInstanceOf(ConflictException.class);
            assertThat(offer.getStatus()).isEqualTo(OfferStatus.EXPIRED);
            assertThat(ride.getStatus()).isEqualTo(RideStatus.SEARCHING);
            assertThat(ride.getAssignedDriverId()).isNull();
        }
    }

    // Returned rather than thrown: a Future buries exceptions, and the assertion needs the type.
    private Throwable acceptCatching(String offerId) {
        try {
            dispatchService.accept(driverUserId, offerId);
            return null;
        } catch (Throwable thrown) {
            return thrown;
        }
    }

    // Proves the accept really is queued on the ride before the sweep lets go.
    private void awaitSomebodyBlockedOnALock() throws InterruptedException {
        Instant giveUp = Instant.now().plus(Duration.ofSeconds(10));
        while (Instant.now().isBefore(giveUp)) {
            Integer waiting = jdbc.queryForObject(
                    "SELECT count(*) FROM pg_stat_activity "
                            + "WHERE wait_event_type = 'Lock' AND datname = current_database()",
                    Integer.class);
            if (waiting != null && waiting > 0) {
                return;
            }
            Thread.sleep(20);
        }
        throw new AssertionError("The accept never queued on the ride lock.");
    }

    private static void awaitQuietly(CountDownLatch latch) {
        try {
            if (!latch.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for the other side.");
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        }
    }

    private String book() {
        return rideRequestService.create(riderUserId, new CreateRideRequest(
                fareEstimateService.estimate(riderUserId, ROUTE).get(0).estimateId(), null, null, null, null)).id();
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
        user.setEmail("expiry-race-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
