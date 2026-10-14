package com.ridex.maps;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.concurrent.ThreadLocalRandom;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.ridex.IntegrationTest;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.maps.google.GoogleMapsProvider;
import com.ridex.shared.exception.ProviderUnavailableException;

/** The same trip asked twice in five minutes is one billed provider call, not two. */
@IntegrationTest
class RouteCacheTest {

    private static final RouteEstimate ROUTE = new RouteEstimate(8200, 1080, "8.2 km", "18 mins", 1260L);

    // The only router the test context can call: ORS has no key here, and Nominatim cannot route.
    @MockitoBean private GoogleMapsProvider google;

    @Autowired private MapsService mapsService;
    @Autowired private StringRedisTemplate redis;

    // Fresh coordinates per test, so one test's cached answer is never another's.
    private double lat;
    private double lng;

    @BeforeEach
    void setUp() {
        when(google.isConfigured()).thenReturn(true);
        when(google.canRoute()).thenReturn(true);
        // On a 4-decimal value, the centre of its cache cell: a nudge near a cell edge would round
        // into the next one, which is a correct miss but not what these tests are about.
        lat = Math.round((12.0 + ThreadLocalRandom.current().nextDouble()) * 1e4) / 1e4;
        lng = Math.round((77.0 + ThreadLocalRandom.current().nextDouble()) * 1e4) / 1e4;
    }

    @Test
    void theSameRouteTwiceCallsTheProviderOnce() {
        when(google.route(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(ROUTE);

        RouteEstimate first = mapsService.route(lat, lng, lat + 0.05, lng + 0.05);
        RouteEstimate second = mapsService.route(lat, lng, lat + 0.05, lng + 0.05);

        assertThat(second).isEqualTo(first).isEqualTo(ROUTE);
        verify(google, times(1)).route(anyDouble(), anyDouble(), anyDouble(), anyDouble());
        // Expires on its own: a stale traffic duration must not outlive the five minutes.
        long ttl = redis.getExpire(RouteCache.key(lat, lng, lat + 0.05, lng + 0.05));
        assertThat(ttl).isPositive().isLessThanOrEqualTo(RouteCache.TTL.toSeconds());
    }

    @Test
    void aPinNudgedAFewMetresIsTheSameRoute() {
        when(google.route(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(ROUTE);

        mapsService.route(lat, lng, lat + 0.05, lng + 0.05);
        // About a metre away, well inside the 11 m the key rounds to.
        mapsService.route(lat + 0.00001, lng, lat + 0.05, lng + 0.05);

        verify(google, times(1)).route(anyDouble(), anyDouble(), anyDouble(), anyDouble());
    }

    @Test
    void aDifferentDestinationIsAskedAfresh() {
        when(google.route(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(ROUTE);

        mapsService.route(lat, lng, lat + 0.05, lng + 0.05);
        mapsService.route(lat, lng, lat + 0.09, lng + 0.09);

        verify(google, times(2)).route(anyDouble(), anyDouble(), anyDouble(), anyDouble());
    }

    @Test
    void aFailureIsNeverCached() {
        when(google.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenThrow(new ProviderUnavailableException("quota"))
                .thenReturn(ROUTE);

        assertThatThrownBy(() -> mapsService.route(lat, lng, lat + 0.05, lng + 0.05))
                .isInstanceOf(ProviderUnavailableException.class);
        // The retry reaches the provider rather than a remembered failure.
        assertThat(mapsService.route(lat, lng, lat + 0.05, lng + 0.05)).isEqualTo(ROUTE);
    }

    @Test
    void anUnreadableEntryIsAMissNotAnError() {
        when(google.route(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(ROUTE);
        redis.opsForValue().set(RouteCache.key(lat, lng, lat + 0.05, lng + 0.05), "{not json");

        assertThat(mapsService.route(lat, lng, lat + 0.05, lng + 0.05)).isEqualTo(ROUTE);
    }
}
