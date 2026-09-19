package com.ridex.admin;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.admin.dto.InviteStaffRequest;
import com.ridex.admin.dto.StaffInvitedResponse;
import com.ridex.admin.dto.StaffResponse;
import com.ridex.auth.RefreshTokenRepository;
import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;

import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Console accounts. Only a super admin runs this, nobody changes their own access, and the last
 * super admin cannot be demoted or switched off - otherwise nobody could let anyone back in.
 */
@Service
@RequiredArgsConstructor
public class StaffService {

    private static final Set<UserRole> STAFF_ROLES = EnumSet.of(UserRole.SUPPORT, UserRole.OPS_ADMIN, UserRole.SUPER_ADMIN);
    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public StaffInvitedResponse invite(InviteStaffRequest request) {
        requireStaffRole(request.role());
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ConflictException("An account with that email already exists.");
        }
        String password = temporaryPassword();
        User user = new User();
        user.setEmail(email);
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName() == null || request.lastName().isBlank() ? null : request.lastName().trim());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setStatus(UserStatus.ACTIVE);
        // Invited by a super admin, so the address is taken as given; the password proves the rest.
        user.setEmailVerifiedAt(Instant.now());
        user.setRoles(EnumSet.of(request.role()));
        userRepository.save(user);
        return new StaffInvitedResponse(toResponse(user), password);
    }

    @Transactional
    public StaffResponse changeRole(String callerUserId, String userId, UserRole role) {
        requireStaffRole(role);
        User user = requireOtherStaff(callerUserId, userId);
        if (user.getRoles().contains(UserRole.SUPER_ADMIN) && role != UserRole.SUPER_ADMIN) {
            requireAnotherSuperAdmin(user);
        }
        user.setRoles(EnumSet.of(role));
        userRepository.save(user);
        // A narrower role takes effect at once, not whenever the old token happens to expire.
        refreshTokenRepository.revokeAllForUser(user.getId(), Instant.now());
        return toResponse(user);
    }

    @Transactional
    public StaffResponse setEnabled(String callerUserId, String userId, boolean enabled) {
        User user = requireOtherStaff(callerUserId, userId);
        if (!enabled && user.getRoles().contains(UserRole.SUPER_ADMIN)) {
            requireAnotherSuperAdmin(user);
        }
        user.setStatus(enabled ? UserStatus.ACTIVE : UserStatus.SUSPENDED);
        userRepository.save(user);
        if (!enabled) {
            refreshTokenRepository.revokeAllForUser(user.getId(), Instant.now());
        }
        return toResponse(user);
    }

    private User requireOtherStaff(String callerUserId, String userId) {
        if (callerUserId.equals(userId)) {
            throw new ConflictException("You cannot change your own access. Ask another super admin.");
        }
        return userRepository.findById(userId)
                .filter(user -> user.getRoles().stream().anyMatch(STAFF_ROLES::contains))
                .orElseThrow(() -> new NotFoundException("No such staff account."));
    }

    private void requireAnotherSuperAdmin(User leaving) {
        boolean another = userRepository.findByAnyRole(List.of(UserRole.SUPER_ADMIN)).stream()
                .anyMatch(user -> !user.getId().equals(leaving.getId()) && user.getStatus() == UserStatus.ACTIVE);
        if (!another) {
            throw new ConflictException("This is the last super admin. Make someone else super admin first.");
        }
    }

    private static void requireStaffRole(UserRole role) {
        if (!STAFF_ROLES.contains(role)) {
            throw new ValidationException("Staff are support agents, operations admins or super admins.");
        }
    }

    /** Twelve characters without look-alikes (no 0/O, 1/l/I), since it is read out or pasted by hand. */
    private static String temporaryPassword() {
        StringBuilder password = new StringBuilder("Rx-");
        for (int index = 0; index < 12; index++) {
            password.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return password.toString();
    }

    static StaffResponse toResponse(User user) {
        String name = Stream.of(user.getFirstName(), user.getLastName())
                .filter(part -> part != null && !part.isBlank())
                .collect(Collectors.joining(" "));
        return new StaffResponse(user.getId(), user.getEmail(), name,
                user.getRoles().stream().map(Enum::name).sorted().toList(),
                user.getStatus().name(), user.getLastLoginAt(), user.getCreatedAt());
    }
}
