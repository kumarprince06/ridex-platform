package com.ridex.driver;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.domain.User;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.driver.dto.DriverProfileResponse;
import com.ridex.driver.dto.UpdateDriverProfileRequest;

import com.ridex.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DriverProfileService {

    private final DriverProfileRepository driverProfileRepository;

    @Transactional
    public DriverProfile createFor(User user) {
        DriverProfile profile = new DriverProfile();
        profile.setUser(user);
        return driverProfileRepository.save(profile);
    }

    @Transactional(readOnly = true)
    public DriverProfileResponse get(String userId) {
        return toResponse(require(userId));
    }

    @Transactional
    public DriverProfileResponse update(String userId, UpdateDriverProfileRequest request) {
        DriverProfile profile = require(userId);
        // Only identity fields. Onboarding status and rating are not editable here - a driver
        // approving themselves would be one PUT away.
        profile.getUser().updateIdentity(request.firstName(), request.lastName(), request.phone());
        return toResponse(profile);
    }

    private DriverProfile require(String userId) {
        return driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."));
    }

    private DriverProfileResponse toResponse(DriverProfile profile) {
        User user = profile.getUser();
        return new DriverProfileResponse(
                profile.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                profile.getProfileImageKey(),
                profile.getOnboardingStatus(),
                profile.getRating(),
                profile.getRatingCount());
    }
}
