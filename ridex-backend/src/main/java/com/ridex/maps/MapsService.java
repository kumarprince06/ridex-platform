package com.ridex.maps;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;

import org.springframework.stereotype.Service;

import com.ridex.maps.domain.GeoLocation;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ProviderUnavailableException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Picks which maps provider answers, and falls through when one cannot.
 *
 * <p>Providers are tried in {@code @Order}: Google first when a key is set, then the free ones.
 * That order is deliberate - Google's data is better, and its free allowance should be spent before
 * anything else is asked.
 *
 * <p>The fallback is the point. A quota that runs out on the 28th of the month would otherwise take
 * fare estimates down with it, and "no rides today" is a worse outcome than a slightly rougher
 * distance. Only availability failures fall through: a genuine "no such place" is an answer, and
 * asking a second provider the same question would just be a slower way to say it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MapsService {

    private final List<MapsProvider> providers;

    public List<GeoLocation> search(String query, int limit) {
        return dedupe(attempt("search", MapsProvider::canGeocode,
                provider -> provider.search(query, limit)));
    }

    /**
     * Drops results that name the same place twice.
     *
     * <p>Geocoders return one entry per matched feature, and a shop, its building and its street
     * entrance are three features at one address - so "Big Bazaar" comes back three times with the
     * same line of text. In a picker that reads as broken search, and picking any of them gives the
     * same pin.
     *
     * <p>Compared on the address rather than the coordinates: the same place is often returned at
     * points a few metres apart, which are different numbers and the same doorway.
     */
    private static List<GeoLocation> dedupe(List<GeoLocation> found) {
        Set<String> seen = new HashSet<>();
        return found.stream()
                .filter(place -> place.formattedAddress() == null
                        || seen.add(place.formattedAddress().toLowerCase(Locale.ROOT)))
                .toList();
    }

    public GeoLocation geocode(String query) {
        return attempt("geocode", MapsProvider::canGeocode, provider -> provider.geocode(query));
    }

    public RouteEstimate route(double pickupLat, double pickupLng,
            double destinationLat, double destinationLng) {
        return attempt("route", MapsProvider::canRoute,
                provider -> provider.route(pickupLat, pickupLng, destinationLat, destinationLng));
    }

    /**
     * Runs the call against each capable provider until one answers.
     *
     * @param capable which providers can do this at all - routing and geocoding are separate
     *                abilities, and the free ones each have only one of them.
     */
    private <T> T attempt(String what, Predicate<MapsProvider> capable,
            Function<MapsProvider, T> call) {
        List<MapsProvider> candidates = providers.stream()
                .filter(provider -> provider.isConfigured() && capable.test(provider))
                .toList();

        if (candidates.isEmpty()) {
            throw new ProviderUnavailableException("No maps provider is configured for " + what + ".");
        }

        ProviderUnavailableException last = null;
        for (MapsProvider provider : candidates) {
            try {
                return call.apply(provider);
            } catch (ProviderUnavailableException ex) {
                // Quota exhausted, key rejected, the provider is down. Worth trying the next one.
                last = ex;
                log.warn("{} failed on {}: {}", what, provider.getClass().getSimpleName(),
                        ex.getMessage());
            } catch (NotFoundException ex) {
                // "Nowhere by that name" is an answer, not a failure. Every provider would give
                // the same one, so asking again only costs time.
                throw ex;
            }
        }

        throw last;
    }
}
