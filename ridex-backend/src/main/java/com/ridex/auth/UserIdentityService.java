package com.ridex.auth;

import org.springframework.stereotype.Service;

import com.ridex.auth.domain.User;
import com.ridex.shared.exception.ConflictException;

import lombok.RequiredArgsConstructor;

/** Rider and driver profile edits both land here, so a taken phone number reads the same in both apps. */
@Service
@RequiredArgsConstructor
public class UserIdentityService {

    private final UserRepository userRepository;

    public void update(User user, String firstName, String lastName, String phone) {
        String wanted = phone == null ? null : phone.trim();
        // Checked up front: uk_users_phone would reject it anyway, but as an opaque 409 at flush.
        if (wanted != null && !wanted.isEmpty() && !wanted.equals(user.getPhone())
                && userRepository.existsByPhone(wanted)) {
            throw new ConflictException("That phone number is already used by another account.");
        }
        user.updateIdentity(firstName, lastName, phone);
    }
}
