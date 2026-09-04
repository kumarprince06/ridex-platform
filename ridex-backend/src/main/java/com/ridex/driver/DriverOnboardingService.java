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
import com.ridex.location.DriverPresence;
import com.ridex.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DriverOnboardingService {

    private final DriverProfileRepository driverProfileRepository;
    private final UserRepository userRepository;
    private final DriverPresence driverPresence;

    @Transactional(readOnly = true)
    public OnboardingResponse status(String driverUserId) {
        return toResponse(requireDriver(driverUserId));
    }

    /**
     * Puts an application in front of a reviewer.
     *
     * <p>ponytail: walks REGISTERED to UNDER_REVIEW in one step. The two intermediate states exist
     * for the profile and document submissions that T7 has not built, so nothing yet checks that a
     * licence was actually uploaded. Split this into the real steps when documents land.
     */
    @Transactional
    public OnboardingResponse submitForReview(String driverUserId) {
        DriverProfile driver = requireDriver(driverUserId);

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
                driver.isEligibleToDrive(),
                driver.getReviewedAt(),
                driver.getRejectionReason());
    }
}
