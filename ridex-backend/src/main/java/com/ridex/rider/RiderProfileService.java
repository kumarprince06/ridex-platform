package com.ridex.rider;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.domain.User;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.rider.dto.RiderProfileResponse;
import com.ridex.rider.dto.UpdateRiderProfileRequest;

import com.ridex.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RiderProfileService {

    private final RiderProfileRepository riderProfileRepository;

    /** Called in the registration transaction. An account with no profile row is a null check in
     *  every screen that follows. */
    @Transactional
    public RiderProfile createFor(User user) {
        RiderProfile profile = new RiderProfile();
        profile.setUser(user);
        return riderProfileRepository.save(profile);
    }

    @Transactional(readOnly = true)
    public RiderProfileResponse get(String userId) {
        return toResponse(require(userId));
    }

    @Transactional
    public RiderProfileResponse update(String userId, UpdateRiderProfileRequest request) {
        RiderProfile profile = require(userId);
        profile.getUser().updateIdentity(request.firstName(), request.lastName(), request.phone());
        return toResponse(profile);
    }

    // Looked up by the caller's own id, never by an id from the request, so there is no ownership
    // check to forget.
    private RiderProfile require(String userId) {
        return riderProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));
    }

    private RiderProfileResponse toResponse(RiderProfile profile) {
        User user = profile.getUser();
        return new RiderProfileResponse(
                profile.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                profile.getProfileImageKey());
    }
}
