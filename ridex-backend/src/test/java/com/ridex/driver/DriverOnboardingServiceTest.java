package com.ridex.driver;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

import java.util.EnumSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.driver.domain.DriverDocumentType;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.location.DriverPresence;
import com.ridex.vehicle.VehicleService;
import com.ridex.vehicle.domain.VehicleType;
import com.ridex.vehicle.dto.AddVehicleRequest;
import com.ridex.shared.exception.ConflictException;

@SpringBootTest
@Transactional
class DriverOnboardingServiceTest {

    @MockitoBean private DriverPresence driverPresence;

    @Autowired private DriverOnboardingService onboarding;
    @Autowired private DriverDocumentService driverDocumentService;
    @Autowired private VehicleService vehicleService;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private DriverProfileRepository driverProfileRepository;
    @Autowired private UserRepository userRepository;

    @Test
    void aNewDriverCannotDriveUntilSomebodyApprovesThem() {
        String driverUserId = newDriver();

        assertThat(onboarding.status(driverUserId).eligibleToDrive()).isFalse();

        onboarding.submitForReview(driverUserId);
        assertThat(onboarding.status(driverUserId).status())
                .isEqualTo(DriverOnboardingStatus.UNDER_REVIEW);
        assertThat(onboarding.status(driverUserId).eligibleToDrive()).isFalse();

        String reviewer = newOpsAdmin();
        approveDocuments(driverUserId, reviewer);
        approveVehicle(driverUserId);
        onboarding.approve(driverId(driverUserId), reviewer);
        assertThat(onboarding.status(driverUserId).eligibleToDrive()).isTrue();
    }

    @Test
    void anApplicationCannotBeApprovedBeforeItIsReviewed() {
        String driverUserId = newDriver();

        // Straight from REGISTERED to APPROVED would skip the review the whole machine exists for.
        assertThatThrownBy(() -> onboarding.approve(driverId(driverUserId), newOpsAdmin()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void aRejectedApplicantIsTerminalRatherThanReopenable() {
        String driverUserId = newDriver();
        String reviewer = newOpsAdmin();
        onboarding.submitForReview(driverUserId);
        onboarding.reject(driverId(driverUserId), reviewer, "Licence photo was unreadable");

        assertThat(onboarding.status(driverUserId).rejectionReason())
                .isEqualTo("Licence photo was unreadable");
        // Re-applying is a new submission, so the trail of why they were rejected survives.
        assertThatThrownBy(() -> onboarding.approve(driverId(driverUserId), reviewer))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void suspendingTakesTheDriverOffDutyImmediately() {
        String driverUserId = newDriver();
        String reviewer = newOpsAdmin();
        onboarding.submitForReview(driverUserId);
        onboarding.approve(driverId(driverUserId), reviewer);

        DriverProfile driver = driverProfileRepository.findByUserId(driverUserId).orElseThrow();
        driver.setOnDuty(true);
        driverProfileRepository.save(driver);

        onboarding.suspend(driverId(driverUserId), reviewer, "Under investigation for a complaint");

        // A suspension that leaves somebody taking rides for another twenty minutes is not one.
        assertThat(driverProfileRepository.findByUserId(driverUserId).orElseThrow().isOnDuty())
                .isFalse();
        verify(driverPresence).goOffDuty(driver.getId());
    }

    @Test
    void theReviewerIsRecordedOnTheDecision() {
        String driverUserId = newDriver();
        String reviewer = newOpsAdmin();
        onboarding.submitForReview(driverUserId);
        onboarding.approve(driverId(driverUserId), reviewer);

        DriverProfile driver = driverProfileRepository.findByUserId(driverUserId).orElseThrow();
        assertThat(driver.getReviewedBy().getId()).isEqualTo(reviewer);
        assertThat(driver.getReviewedAt()).isNotNull();
    }

    // Driving is gated on approved documents, not on the application status alone.
    private void approveDocuments(String driverUserId, String reviewerUserId) {
        driverDocumentService.forDriver(driverId(driverUserId))
                .forEach(doc -> driverDocumentService.review(doc.id(), reviewerUserId, true, null));
    }

    private void approveVehicle(String driverUserId) {
        var vehicle = vehicleService.add(driverUserId, new AddVehicleRequest(
                VehicleType.HATCHBACK, "Maruti", "Swift", 2020, "White", 4,
                "KA01AB" + (System.nanoTime() % 10000)));
        vehicleService.review(vehicle.id(), true);
    }

    private String driverId(String driverUserId) {
        return driverProfileRepository.findByUserId(driverUserId).orElseThrow().getId();
    }

    private String newDriver() {
        User user = newUser(UserRole.DRIVER);
        driverProfileService.createFor(user);
        // Review will not accept an application without its required documents on file.
        for (DriverDocumentType type : DriverDocumentType.values()) {
            if (type.isRequiredForReview()) {
                driverDocumentService.submit(user.getId(), type, null,
                        new MockMultipartFile("file", type.name() + ".pdf", "application/pdf",
                                "irrelevant".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            }
        }
        return user.getId();
    }

    private String newOpsAdmin() {
        return newUser(UserRole.OPS_ADMIN).getId();
    }

    private User newUser(UserRole role) {
        User user = new User();
        user.setEmail("onboarding-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}
