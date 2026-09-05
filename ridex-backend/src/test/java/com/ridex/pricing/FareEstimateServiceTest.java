package com.ridex.pricing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.times;
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
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.maps.MapsService;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.pricing.domain.FareEstimate;
import com.ridex.pricing.domain.FareLineType;
import com.ridex.pricing.dto.EstimateOptionResponse;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.rider.RiderProfileService;

// Against the real schema and the seeded rates, with only the billed maps call stubbed.
@SpringBootTest
@Transactional
class FareEstimateServiceTest {

    private static final EstimateRequest ROUTE =
            new EstimateRequest(12.9352, 77.6245, 12.9784, 77.6408);

    @MockitoBean
    private MapsService mapsProvider;

    @Autowired private FareEstimateService fareEstimateService;
    @Autowired private FareEstimateRepository fareEstimateRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RiderProfileService riderProfileService;

    private String riderUserId;

    @BeforeEach
    void setUp() {
        // 8.2 km, 18 minutes.
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins"));

        User rider = new User();
        rider.setEmail("estimate-" + Instant.now().toEpochMilli() + "@example.com");
        rider.setPasswordHash("irrelevant");
        rider.setStatus(UserStatus.ACTIVE);
        rider.setRoles(EnumSet.of(UserRole.RIDER));
        userRepository.save(rider);
        riderProfileService.createFor(rider);
        riderUserId = rider.getId();
    }

    @Test
    void pricesEveryActiveRideTypeFromOneRouteLookup() {
        List<EstimateOptionResponse> options = fareEstimateService.estimate(riderUserId, ROUTE);

        assertThat(options).extracting(EstimateOptionResponse::rideTypeCode)
                .containsExactly("ECONOMY", "COMFORT", "XL");

        // One call for all three: the distance does not change with the car, and the provider
        // bills per call.
        verify(mapsProvider, times(1)).route(anyDouble(), anyDouble(), anyDouble(), anyDouble());
    }

    @Test
    void everyOptionsLinesSumToItsTotal() {
        for (EstimateOptionResponse option : fareEstimateService.estimate(riderUserId, ROUTE)) {
            long summed = option.lines().stream().mapToLong(line -> line.amountMinor()).sum();

            assertThat(summed).as(option.rideTypeCode()).isEqualTo(option.totalMinor());
        }
    }

    @Test
    void theQuoteAndItsLinesArePersisted() {
        EstimateOptionResponse option = fareEstimateService.estimate(riderUserId, ROUTE).get(0);

        FareEstimate stored = fareEstimateRepository.findById(option.estimateId()).orElseThrow();

        // Stored so the final charge can be explained against what the rider agreed to.
        assertThat(stored.getTotalMinor()).isEqualTo(option.totalMinor());
        assertThat(stored.getDistanceMeters()).isEqualTo(8200);
        assertThat(stored.getExpiresAt()).isAfter(Instant.now());
        assertThat(stored.getLines()).extracting(line -> line.getLineType())
                .containsExactly(FareLineType.BASE, FareLineType.DISTANCE, FareLineType.TIME);
    }

    @Test
    void aPricierTypeCostsMoreForTheSameRoute() {
        List<EstimateOptionResponse> options = fareEstimateService.estimate(riderUserId, ROUTE);

        assertThat(options.get(0).totalMinor()).isLessThan(options.get(1).totalMinor());
        assertThat(options.get(1).totalMinor()).isLessThan(options.get(2).totalMinor());
    }
}
