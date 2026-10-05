package com.ridex.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.ridex.auth.AuthService;
import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.dto.LoginRequest;
import com.ridex.auth.dto.RegisterRequest;
import com.ridex.dispatch.DriverDutyService;
import com.ridex.dispatch.dto.DutyRequest;

// Its own Postgres and Redis, not the shared @IntegrationTest pair: the reset drops the whole
// schema, and every other test class would lose its data mid-run.
@SpringBootTest
@ActiveProfiles("demo")
@Import(DemoProfileTest.Containers.class)
class DemoProfileTest {

    private static final String PASSWORD = "RideX-demo-2026";

    @Autowired private DemoSeeder seeder;
    @Autowired private DemoReset reset;
    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private DriverDutyService driverDutyService;
    @Autowired private WebApplicationContext context;

    @Test
    void eachSeededAccountSignsIntoItsOwnApp() {
        assertThat(login(DemoSeeder.RIDER_EMAIL, AppContext.RIDER).roles()).containsExactly(UserRole.RIDER);
        assertThat(login(DemoSeeder.DRIVER_EMAIL, AppContext.DRIVER).roles()).containsExactly(UserRole.DRIVER);
        // The password is public, so the console account can look but not change money or people.
        assertThat(login(DemoSeeder.SUPPORT_EMAIL, AppContext.ADMIN).roles()).containsExactly(UserRole.SUPPORT);
    }

    @Test
    void theSeededDriverPassesEligibilityAndCanGoOnDuty() {
        String driverId = userRepository.findByEmail(DemoSeeder.DRIVER_EMAIL).orElseThrow().getId();

        // Step one of the walkthrough: approval, documents and vehicle all have to hold.
        assertThatCode(() -> driverDutyService.setDuty(driverId, new DutyRequest(true, 26.9124, 75.7873)))
                .doesNotThrowAnyException();
    }

    @Test
    void seedingAgainCreatesNothing() {
        long before = userRepository.count();

        // A restart runs the seeder again.
        seeder.seed();

        assertThat(userRepository.count()).isEqualTo(before);
    }

    @Test
    void theResetLeavesOnlyTheSeededState() {
        authService.register(new RegisterRequest("visitor@example.com", "Visitor@2026", UserRole.RIDER));

        reset.reset();

        assertThat(userRepository.findByEmail("visitor@example.com")).isEmpty();
        assertThat(userRepository.count()).isEqualTo(3);
        assertThat(login(DemoSeeder.RIDER_EMAIL, AppContext.RIDER).accessToken()).isNotBlank();
    }

    @Test
    void bookingIsRateLimitedOnTheDemo() throws Exception {
        var mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity()).build();

        // Outside the demo only auth and estimates are limited; here anyone can sign in, so a
        // booking flood is as open as a login one. The filter runs before authentication.
        int last = 0;
        for (int i = 0; i <= 30; i++) {
            last = mockMvc.perform(post("/api/v1/rides").header("X-Forwarded-For", "203.0.113.7"))
                    .andReturn().getResponse().getStatus();
        }
        assertThat(last).isEqualTo(429);
    }

    private com.ridex.auth.dto.LoginResponse login(String email, AppContext app) {
        return authService.login(new LoginRequest(email, PASSWORD, app), "demo-test", "127.0.0.1");
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Containers {

        @Bean
        @ServiceConnection
        PostgreSQLContainer postgres() {
            return new PostgreSQLContainer("postgres:17-alpine").withDatabaseName("ridex_demo_test");
        }

        @Bean
        @ServiceConnection(name = "redis")
        GenericContainer<?> redis() {
            return new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);
        }
    }
}
