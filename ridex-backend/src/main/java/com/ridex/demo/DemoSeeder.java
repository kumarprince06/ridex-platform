package com.ridex.demo;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.EnumSet;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.driver.DriverDocumentRepository;
import com.ridex.driver.DriverOnboardingService;
import com.ridex.driver.DriverProfileService;
import com.ridex.driver.domain.DriverDocument;
import com.ridex.driver.domain.DriverDocumentStatus;
import com.ridex.driver.domain.DriverDocumentType;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.rider.RiderProfileService;
import com.ridex.vehicle.VehicleService;
import com.ridex.vehicle.domain.VehicleType;
import com.ridex.vehicle.dto.AddVehicleRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// The accounts a reviewer signs in with. A runner rather than a migration: migrations run in every
// environment, and these published passwords must never exist outside the demo.
@Slf4j
@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoSeeder implements ApplicationRunner {

    // .example is reserved (RFC 2606): mail queued for these can never reach a real inbox.
    static final String RIDER_EMAIL = "rider@ridex.example";
    static final String DRIVER_EMAIL = "driver@ridex.example";
    static final String SUPPORT_EMAIL = "support@ridex.example";

    // No such user, so the approval is stamped with no reviewer rather than a fake one.
    private static final String SEEDED = "demo-seed";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RiderProfileService riderProfileService;
    private final DriverProfileService driverProfileService;
    private final DriverDocumentRepository documentRepository;
    private final DriverOnboardingService onboardingService;
    private final VehicleService vehicleService;

    @Value("${app.demo.password}")
    private String password;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seed();
    }

    // One transaction, so the rider existing means everything does: a restart seeds nothing twice.
    @Transactional
    public void seed() {
        if (userRepository.existsByEmail(RIDER_EMAIL)) {
            return;
        }

        riderProfileService.createFor(account(RIDER_EMAIL, "Asha", "Rider", UserRole.RIDER));
        account(SUPPORT_EMAIL, "Sam", "Support", UserRole.SUPPORT);

        // Through the real onboarding and vehicle review, so the demo driver passes the same
        // eligibility check as anyone else. Location is not seeded: presence goes stale in minutes.
        User driver = account(DRIVER_EMAIL, "Dev", "Driver", UserRole.DRIVER);
        DriverProfile profile = driverProfileService.createFor(driver);
        approvedDocuments(profile);
        onboardingService.submitForReview(driver.getId());
        onboardingService.approve(profile.getId(), SEEDED);

        var car = vehicleService.add(driver.getId(), new AddVehicleRequest(
                VehicleType.SEDAN, "Maruti", "Dzire", 2023, "White", 4, "RJ14DM0001"));
        vehicleService.review(car.id(), true);

        log.warn("Seeded the demo accounts. This profile resets all data nightly; never use it for real data.");
    }

    private User account(String email, String firstName, String lastName, UserRole role) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRoles(EnumSet.of(role));
        // Verified already: the walkthrough must not depend on a mail server the demo may not have.
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(Instant.now());
        user.updateIdentity(firstName, lastName, null);
        return userRepository.save(user);
    }

    // No upload: nobody on the demo can open a document, since SUPPORT has no access to them.
    private void approvedDocuments(DriverProfile profile) {
        Arrays.stream(DriverDocumentType.values())
                .filter(DriverDocumentType::isRequiredForReview)
                .forEach(type -> {
                    DriverDocument document = new DriverDocument();
                    document.setDriver(profile);
                    document.setDocumentType(type);
                    document.setStatus(DriverDocumentStatus.APPROVED);
                    document.setStorageKey("demo/" + type);
                    document.setExpiresAt(Instant.now().plus(365, ChronoUnit.DAYS));
                    documentRepository.save(document);
                });
    }
}
