package com.ridex.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.EnumSet;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.driver.DriverProfileService;
import com.ridex.platform.security.JwtService;

/**
 * Who may do what, proven rather than annotated.
 *
 * <p>docs/07 splits case handling from financial and operational authority. One person holding
 * both is the standard internal-fraud pattern in a marketplace, so it is worth a test.
 */
@SpringBootTest
class AdminAccessTest {

    @Autowired private WebApplicationContext context;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private DriverProfileService driverProfileService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void supportCanReadPeopleAndTripsBecauseThatIsWhatACaseNeeds() throws Exception {
        String token = tokenFor(UserRole.SUPPORT);

        mockMvc.perform(get("/api/v1/admin/riders").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/trips").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk());
    }

    @Test
    void supportCannotApproveADriver() throws Exception {
        String driverId = newDriverProfileId();

        // Approving a driver is an operational decision with money behind it.
        mockMvc.perform(post("/api/v1/admin/drivers/" + driverId + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, tokenFor(UserRole.SUPPORT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void supportCannotReadTheAuditLog() throws Exception {
        // It records what everyone else did, including them.
        mockMvc.perform(get("/api/v1/admin/audit")
                        .header(HttpHeaders.AUTHORIZATION, tokenFor(UserRole.SUPPORT)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/audit")
                        .header(HttpHeaders.AUTHORIZATION, tokenFor(UserRole.SUPER_ADMIN)))
                .andExpect(status().isOk());
    }

    @Test
    void aRiderTokenReachesNoneOfIt() throws Exception {
        String token = tokenFor(UserRole.RIDER, AppContext.RIDER);

        mockMvc.perform(get("/api/v1/admin/dashboard").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectingWithoutAReasonIsRefusedByTheApi() throws Exception {
        String driverId = newDriverProfileId();

        // The console asks for a reason, but a client is not a control.
        mockMvc.perform(post("/api/v1/admin/drivers/" + driverId + "/reject")
                        .header(HttpHeaders.AUTHORIZATION, tokenFor(UserRole.OPS_ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"too short\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theAuditLogIsReachableAndEmptyRatherThanMissing() throws Exception {
        String body = mockMvc.perform(get("/api/v1/admin/audit")
                        .header(HttpHeaders.AUTHORIZATION, tokenFor(UserRole.SUPER_ADMIN)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("\"items\"").contains("\"totalItems\"");
    }

    private String newDriverProfileId() {
        User user = newUser(UserRole.DRIVER);
        return driverProfileService.createFor(user).getId();
    }

    private String tokenFor(UserRole role) {
        return tokenFor(role, AppContext.ADMIN);
    }

    private String tokenFor(UserRole role, AppContext app) {
        User user = newUser(role);
        return "Bearer " + jwtService.generateAccessToken(
                user.getId(), user.getEmail(), Set.of(role), app);
    }

    private User newUser(UserRole role) {
        User user = new User();
        user.setEmail("admin-access-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
