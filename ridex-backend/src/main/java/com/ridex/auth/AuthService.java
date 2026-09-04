package com.ridex.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Locale;
import java.util.UUID;
import java.util.Set;

import jakarta.annotation.PostConstruct;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.dto.LoginRequest;
import com.ridex.auth.dto.LoginResponse;
import com.ridex.auth.dto.LogoutRequest;
import com.ridex.auth.dto.RefreshTokenRequest;
import com.ridex.auth.dto.RefreshTokenResponse;
import com.ridex.auth.dto.RegisterRequest;
import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.AuthEventType;
import com.ridex.auth.domain.RefreshToken;
import com.ridex.auth.domain.TokenPurpose;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.auth.domain.UserToken;
import com.ridex.platform.security.JwtService;
import com.ridex.shared.util.VerificationTokenGenerator;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration VERIFICATION_TOKEN_VALIDITY = Duration.ofHours(24);
    private static final Duration REFRESH_TOKEN_VALIDITY = Duration.ofDays(7);

    // Hash of a random value, computed at startup so it always matches the configured cost factor.
    private String absentUserHash;

    private final UserRepository userRepository;
    private final UserTokenRepository userTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthSecurityService authSecurityService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @PostConstruct
    void generateDecoyHash() {
        absentUserHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    /**
     * A taken address produces no account and no error - the caller always sees the same 202, or
     * the response becomes a membership oracle. The owner is told by email instead.
     *
     * @return raw verification token, or null when the address already has an account.
     */
    @Transactional
    public String register(RegisterRequest request) {
        if (!request.role().isSelfRegisterable()) {
            // Otherwise a public request body decides who is staff.
            throw new IllegalArgumentException("Accounts of that type cannot be self-registered.");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);

        // Unconditional: skipping this on the taken path is ~200ms faster and leaks by timing.
        String passwordHash = passwordEncoder.encode(request.password());

        if (userRepository.existsByEmail(email)) {
            // ponytail: a concurrent duplicate still 409s from the unique constraint. Closing that
            // needs registration behind a queue - not worth it before there are users.
            return null;
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordHash);
        user.setStatus(UserStatus.PENDING);
        user.setRoles(EnumSet.of(request.role()));
        userRepository.save(user);

        String rawToken = VerificationTokenGenerator.generateRawToken();

        UserToken token = new UserToken();
        token.setUser(user);
        token.setPurpose(TokenPurpose.EMAIL_VERIFICATION);
        token.setTokenHash(VerificationTokenGenerator.hash(rawToken));
        token.setExpiresAt(Instant.now().plus(VERIFICATION_TOKEN_VALIDITY));
        userTokenRepository.save(token);

        return rawToken;
    }

    @Transactional
    public LoginResponse login(LoginRequest request, String userAgent, String ipAddress) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email).orElse(null);

        // Decoy hash rather than an early return, so an unknown address costs the same as a known
        // one. The timing difference is measurable and enumerates every account.
        String storedHash = user == null ? absentUserHash : user.getPasswordHash();
        boolean passwordMatches = passwordEncoder.matches(request.password(), storedHash);

        if (user == null || !passwordMatches) {
            // Recorded even with no account: those rows are what credential stuffing looks like.
            authSecurityService.record(user == null ? null : user.getId(), AuthEventType.LOGIN_FAILED,
                    ipAddress, userAgent, "bad credentials");
            throw new BadCredentialsException("Invalid email or password");
        }

        requireLoginableStatus(user);

        AppContext app = request.app();
        Set<UserRole> granted = app.grantableFrom(user.getRoles());
        if (granted.isEmpty()) {
            authSecurityService.record(user.getId(), AuthEventType.LOGIN_BLOCKED, ipAddress, userAgent,
                    "no role for surface " + app);
            // The password was correct, so this is an authorization answer, not an identity one -
            // and it is the message that stops a driver being told only "403" in the driver app.
            throw new AccessDeniedException(app.rejectionMessage());
        }

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), granted, app);
        String refreshTokenValue = jwtService.generateRefreshToken(user.getId(), user.getEmail(), granted, app);

        // One row per login, not one row per user. The previous code deleted every existing token
        // on each login, so signing in on a phone silently signed the same person out on a tablet.
        Instant now = Instant.now();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(VerificationTokenGenerator.hash(refreshTokenValue));
        refreshToken.setUserAgent(truncate(userAgent, 255));
        refreshToken.setIpAddress(truncate(ipAddress, 45));
        refreshToken.setLastUsedAt(now);
        refreshToken.setExpiresAt(now.plus(REFRESH_TOKEN_VALIDITY));
        refreshTokenRepository.save(refreshToken);

        user.setLastLoginAt(now);
        userRepository.save(user);

        authSecurityService.record(user.getId(), AuthEventType.LOGIN_SUCCEEDED, ipAddress, userAgent, "app=" + app);

        return new LoginResponse(
                accessToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                granted,
                app,
                refreshTokenValue);
    }

    @Transactional
    public RefreshTokenResponse refresh(RefreshTokenRequest request) {
        String rawRefreshToken = request.refreshToken().trim();

        Claims claims;
        try {
            claims = jwtService.parseClaims(rawRefreshToken);
        } catch (RuntimeException ex) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        if (!JwtService.TOKEN_TYPE_REFRESH.equals(claims.get(JwtService.CLAIM_TOKEN_TYPE, String.class))) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        String presentedHash = VerificationTokenGenerator.hash(rawRefreshToken);
        Instant now = Instant.now();

        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(presentedHash)
                .orElseGet(() -> {
                    // Not current: check whether it is the generation this row just replaced.
                    refreshTokenRepository.findByPreviousTokenHash(presentedHash)
                            .ifPresent(spent -> authSecurityService.respondToTokenReuse(
                                    spent.getUser().getId(), now));
                    throw new BadCredentialsException("Invalid refresh token");
                });

        if (!storedToken.isLiveAt(now)) {
            throw new BadCredentialsException("Refresh token expired or revoked");
        }

        User user = storedToken.getUser();
        requireLoginableStatus(user);

        AppContext app = AppContext.valueOf(claims.get(JwtService.CLAIM_APP, String.class));

        // Re-derived from the account rather than copied from the old token, so a role removed by
        // operations stops applying at the next refresh instead of surviving for the token's life.
        Set<UserRole> granted = app.grantableFrom(user.getRoles());
        if (granted.isEmpty()) {
            storedToken.setRevokedAt(now);
            refreshTokenRepository.save(storedToken);
            throw new AccessDeniedException(app.rejectionMessage());
        }

        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), granted, app);
        String newRefreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail(), granted, app);

        // The row is the device session: same identity and user_agent, new secret, previous one kept.
        storedToken.rotateTo(
                VerificationTokenGenerator.hash(newRefreshToken), now, now.plus(REFRESH_TOKEN_VALIDITY));
        refreshTokenRepository.save(storedToken);

        authSecurityService.record(user.getId(), AuthEventType.TOKEN_REFRESHED, null, null, "app=" + app);

        return new RefreshTokenResponse(
                newAccessToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                granted,
                app,
                newRefreshToken);
    }

    // Silent on an unknown, revoked or someone else's token: distinguishing them would answer
    // questions about other people's sessions.
    @Transactional
    public void logout(LogoutRequest request, String callerUserId) {
        refreshTokenRepository.findByTokenHash(VerificationTokenGenerator.hash(request.refreshToken().trim()))
                .filter(token -> token.getUser().getId().equals(callerUserId))
                .filter(token -> token.getRevokedAt() == null)
                .ifPresent(token -> {
                    token.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(token);
                    authSecurityService.record(callerUserId, AuthEventType.LOGOUT, null, null, "session revoked");
                });
    }

    /**
     * Only a fully active account may hold a session. The previous version rejected PENDING alone,
     * which let a SUSPENDED or DELETED account log in normally.
     */
    private void requireLoginableStatus(User user) {
        if (user.getStatus() == UserStatus.ACTIVE) {
            return;
        }

        throw new AccessDeniedException(switch (user.getStatus()) {
            case PENDING -> "Email verification is required before login.";
            case SUSPENDED -> "This account is suspended.";
            default -> "This account is not active.";
        });
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
