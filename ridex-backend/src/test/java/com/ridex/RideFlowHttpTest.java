package com.ridex;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.jayway.jsonpath.JsonPath;
import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.driver.DriverDocumentRepository;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.DriverProfileService;
import com.ridex.driver.domain.DriverDocument;
import com.ridex.driver.domain.DriverDocumentStatus;
import com.ridex.driver.domain.DriverDocumentType;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.maps.MapsService;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.platform.security.JwtService;
import com.ridex.rider.RiderProfileService;
import com.ridex.vehicle.DriverVehicleRepository;
import com.ridex.vehicle.domain.DriverVehicle;
import com.ridex.vehicle.domain.VehicleStatus;
import com.ridex.vehicle.domain.VehicleType;

/**
 * One ride from booking to receipt, through the API both apps call. TripLifecycleTest drives the
 * services with presence and dispatch stubbed; here the driver is found through real Redis
 * presence and the offer comes from the dispatch that fires when the booking commits.
 */
@IntegrationTest
class RideFlowHttpTest {

    // Jaipur: no other test reports drivers here, and they all share one Redis, so the first wave
    // can only reach this test's driver.
    private static final double PICKUP_LAT = 26.9124;
    private static final double PICKUP_LNG = 75.7873;

    // The one external call. Everything else is the application as deployed.
    @MockitoBean private MapsService mapsProvider;

    @Autowired private WebApplicationContext context;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private DriverDocumentRepository documentRepository;
    @Autowired private DriverVehicleRepository vehicleRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        when(mapsProvider.route(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteEstimate(8200, 1080, "8.2 km", "18 mins", null));
    }

    @Test
    void aRideGoesFromBookingToAReceipt() throws Exception {
        String rider = tokenFor(newUser(UserRole.RIDER), AppContext.RIDER);
        String driver = tokenFor(eligibleDriver(), AppContext.DRIVER);

        // Driver: on duty at the pickup, which puts them in Redis presence.
        call(driver, put("/api/v1/driver/duty"),
                Map.of("onDuty", true, "latitude", PICKUP_LAT, "longitude", PICKUP_LNG), 204);

        // Rider: quote, then book the first option. Dispatch runs once the booking commits.
        String estimate = call(rider, post("/api/v1/rides/estimate"), Map.of(
                "pickupLat", PICKUP_LAT, "pickupLng", PICKUP_LNG,
                "destinationLat", 26.8505, "destinationLng", 75.8040), 200);
        long quotedTotal = ((Number) JsonPath.read(estimate, "$[0].totalMinor")).longValue();
        String rideId = JsonPath.read(call(rider, post("/api/v1/rides"), Map.of(
                "estimateId", JsonPath.read(estimate, "$[0].estimateId"),
                "pickupAddress", "Hawa Mahal", "destinationAddress", "Jaipur Junction"), 201), "$.id");

        // Driver: the offer is waiting, and accepting it hands over the trip.
        List<String> offerIds = JsonPath.read(call(driver, get("/api/v1/driver/offers"), null, 200),
                "$[*].offerId");
        assertThat(offerIds).hasSize(1);
        String tripId = JsonPath.read(call(driver,
                post("/api/v1/driver/offers/" + offerIds.get(0) + "/accept"), null, 200), "$.tripId");
        assertThat(rideStatus(rider, rideId)).isEqualTo("DRIVER_ASSIGNED");

        // The rider reads the pickup code off their screen; the driver needs it to start.
        String pickupCode = JsonPath.read(call(rider, get("/api/v1/rides/" + rideId), null, 200),
                "$.pickupCode");
        call(driver, post("/api/v1/trips/" + tripId + "/arrive"), null, 200);
        assertThat(rideStatus(rider, rideId)).isEqualTo("DRIVER_AT_PICKUP");
        call(driver, post("/api/v1/trips/" + tripId + "/start"), Map.of("pickupCode", pickupCode), 200);
        assertThat(rideStatus(rider, rideId)).isEqualTo("TRIP_STARTED");
        call(driver, post("/api/v1/trips/" + tripId + "/complete"),
                Map.of("distanceMeters", 8200, "durationSeconds", 1080), 200);
        assertThat(rideStatus(rider, rideId)).isEqualTo("COMPLETED");

        // Driven exactly as quoted, promptly picked up: the charge is the quote, line for line.
        String receipt = call(rider, get("/api/v1/rides/" + rideId + "/receipt"), null, 200);
        long charged = ((Number) JsonPath.read(receipt, "$.chargedTotalMinor")).longValue();
        List<Number> lines = JsonPath.read(receipt, "$.chargedLines[*].amountMinor");
        assertThat(charged).isEqualTo(quotedTotal).isPositive();
        assertThat(lines.stream().mapToLong(Number::longValue).sum()).isEqualTo(charged);
    }

    private String rideStatus(String rider, String rideId) throws Exception {
        return JsonPath.read(call(rider, get("/api/v1/rides/" + rideId), null, 200), "$.status");
    }

    private String call(String token, MockHttpServletRequestBuilder request, Map<String, ?> body,
            int expectedStatus) throws Exception {
        request.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON);
        if (body != null) {
            request.content(JsonPath.parse(body).jsonString());
        }
        var response = mockMvc.perform(request).andReturn().getResponse();
        assertThat(response.getStatus()).as(response.getContentAsString()).isEqualTo(expectedStatus);
        return response.getContentAsString();
    }

    private String tokenFor(User user, AppContext app) {
        return jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRoles(), app);
    }

    // Onboarding and review have their own tests; this ride needs a driver who has been through them.
    private User eligibleDriver() {
        User user = newUser(UserRole.DRIVER);
        DriverProfile profile = driverProfileService.createFor(user);
        profile.setOnboardingStatus(DriverOnboardingStatus.APPROVED);
        driverProfileRepository.save(profile);

        for (DriverDocumentType type : DriverDocumentType.values()) {
            if (type.isRequiredForReview()) {
                DriverDocument document = new DriverDocument();
                document.setDriver(profile);
                document.setDocumentType(type);
                document.setStatus(DriverDocumentStatus.APPROVED);
                document.setStorageKey("test/" + type);
                document.setExpiresAt(Instant.now().plusSeconds(86_400));
                documentRepository.save(document);
            }
        }

        DriverVehicle car = new DriverVehicle();
        car.setDriver(profile);
        car.setVehicleType(VehicleType.SEDAN);
        car.setStatus(VehicleStatus.ACTIVE);
        car.setMake("Maruti");
        car.setModel("Dzire");
        car.setManufactureYear((short) 2023);
        car.setSeatCapacity((short) 4);
        car.setRegistrationNumber("RJ" + System.nanoTime() % 100_000_000L);
        vehicleRepository.save(car);
        return user;
    }

    private User newUser(UserRole role) {
        User user = new User();
        user.setEmail("flow-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        userRepository.save(user);
        if (role == UserRole.RIDER) {
            riderProfileService.createFor(user);
        }
        return user;
    }
}
