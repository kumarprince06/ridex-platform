package com.ridex.driver;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.driver.dto.OnboardingResponse;
import com.ridex.driver.domain.DriverDocumentType;
import com.ridex.location.DriverPresence;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DriverOnboardingService {

    private final DriverProfileRepository driverProfileRepository;
    private final UserRepository userRepository;
    private final DriverPresence driverPresence;
    private final DriverDocumentService driverDocumentService;
    private final DriverEligibility driverEligibility;

    @Transactional(readOnly = true)
    public OnboardingResponse status(String driverUserId) {
        return toResponse(requireDriver(driverUserId));
    }

    /**
     * Puts an application in front of a reviewer.
     *
     * <p>Refuses until every required document is on file. A reviewer opening an application with
     * no licence attached is a wasted queue slot and a rejection the driver could have avoided.
     */
    @Transactional
    public OnboardingResponse submitForReview(String driverUserId) {
        DriverProfile driver = requireDriver(driverUserId);

        List<DriverDocumentType> missing = driverDocumentService.missingForReview(driver.getId());
        if (!missing.isEmpty()) {
            throw new ValidationException("Upload these before submitting: " + missing.stream()
                    .map(type -> type.name().toLowerCase(java.util.Locale.ROOT).replace('_', ' '))
                    .reduce((a, b) -> a + ", " + b).orElse(""));
        }

        if (driver.getOnboardingStatus() == DriverOnboardingStatus.REGISTERED) {
            driver.transitionTo(DriverOnboardingStatus.PROFILE_SUBMITTED);
        }
        if (driver.getOnboardingStatus() == DriverOnboardingStatus.PROFILE_SUBMITTED) {
            driver.transitionTo(DriverOnboardingStatus.DOCUMENTS_SUBMITTED);
        }
        driver.transitionTo(DriverOnboardingStatus.UNDER_REVIEW);

        return toResponse(driverProfileRepository.save(driver));
    }

    @Transactional(readOnly = true)
    public List<OnboardingResponse> awaitingReview() {
        return driverProfileRepository
                .findByOnboardingStatusOrderByCreatedAtAsc(DriverOnboardingStatus.UNDER_REVIEW)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public OnboardingResponse approve(String driverId, String reviewerUserId) {
        DriverProfile driver = requireProfile(driverId);
        driver.transitionTo(DriverOnboardingStatus.APPROVED);
        stampReview(driver, reviewerUserId, null);
        return toResponse(driverProfileRepository.save(driver));
    }

    @Transactional
    public OnboardingResponse reject(String driverId, String reviewerUserId, String reason) {
        DriverProfile driver = requireProfile(driverId);
        driver.transitionTo(DriverOnboardingStatus.REJECTED);
        stampReview(driver, reviewerUserId, reason);
        return toResponse(driverProfileRepository.save(driver));
    }

    @Transactional
    public OnboardingResponse suspend(String driverId, String reviewerUserId, String reason) {
        DriverProfile driver = requireProfile(driverId);
        driver.transitionTo(DriverOnboardingStatus.SUSPENDED);
        stampReview(driver, reviewerUserId, reason);

        // Off duty and out of the dispatch pool immediately. A suspension that leaves someone
        // taking rides for another twenty minutes is not a suspension.
        driver.setOnDuty(false);
        driverPresence.goOffDuty(driver.getId());

        return toResponse(driverProfileRepository.save(driver));
    }

    /**
     * ponytail: who decided and why is stamped on the profile, which is the audit trail for this
     * one action. The platform-wide audit_logs table arrives with T15.
     */
    private void stampReview(DriverProfile driver, String reviewerUserId, String reason) {
        driver.setReviewedAt(Instant.now());
        userRepository.findById(reviewerUserId).ifPresent(driver::setReviewedBy);
        driver.setRejectionReason(reason);
    }

    private DriverProfile requireDriver(String driverUserId) {
        return driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."));
    }

    private DriverProfile requireProfile(String driverId) {
        return driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new NotFoundException("No such driver."));
    }

    private OnboardingResponse toResponse(DriverProfile driver) {
        User user = driver.getUser();
        return new OnboardingResponse(
                driver.getId(),
                user.getEmail(),
                driver.getOnboardingStatus(),
                // The real answer, not just the status: documents expire and vehicles get rejected
                // without the profile changing at all.
                driverEligibility.isEligible(driver.getId()),
                driver.getReviewedAt(),
                driver.getRejectionReason());
    }
}
