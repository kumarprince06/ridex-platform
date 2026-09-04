package com.ridex.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.Set;

import jakarta.annotation.PostConstruct;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.dto.LoginRequest;
import com.ridex.auth.dto.LoginResponse;
import com.ridex.auth.dto.LogoutRequest;
import com.ridex.auth.dto.ForgotPasswordRequest;
import com.ridex.auth.dto.RefreshTokenRequest;
import com.ridex.auth.dto.RefreshTokenResponse;
import com.ridex.auth.dto.RegisterRequest;
import com.ridex.auth.dto.SessionResponse;
import com.ridex.auth.dto.ResetPasswordRequest;
import com.ridex.auth.dto.VerifyEmailRequest;
import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.AuthEventType;
import com.ridex.auth.domain.RefreshToken;
import com.ridex.auth.domain.TokenPurpose;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.auth.domain.UserToken;
import com.ridex.driver.DriverProfileService;
import com.ridex.notification.DeliveryChannel;
import com.ridex.notification.Notifier;
import com.ridex.platform.ratelimit.RateLimiter;
import com.ridex.rider.RiderProfileService;
import com.ridex.platform.ratelimit.TooManyRequestsException;
import com.ridex.platform.security.JwtService;
import com.ridex.shared.util.OtpGenerator;
import com.ridex.shared.util.VerificationTokenGenerator;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    // Short, because six digits is small. Safety here is expiry plus the attempt cap.
    private static final Duration OTP_VALIDITY = Duration.ofMinutes(10);
    private static final Duration REFRESH_TOKEN_VALIDITY = Duration.ofDays(7);

    // Hash of a random value, computed at startup so it always matches the configured cost factor.
    private String absentUserHash;

    private final UserRepository userRepository;
    private final UserTokenRepository userTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthSecurityService authSecurityService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final RateLimiter rateLimiter;
    private final Notifier notifier;
    private final RiderProfileService riderProfileService;
    private final DriverProfileService driverProfileService;

    @Value("${app.rate-limit.login-failures:8}")
    private int loginFailureLimit;

    @Value("${app.rate-limit.login-window:15m}")
    private Duration loginWindow;

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
    public void register(RegisterRequest request) {
        if (!request.role().isSelfRegisterable()) {
            // Otherwise a public request body decides who is staff.
            throw new IllegalArgumentException("Accounts of that type cannot be self-registered.");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);

        // Unconditional: skipping this on the taken path is ~200ms faster and leaks by timing.
        String passwordHash = passwordEncoder.encode(request.password());

        if (userRepository.existsByEmail(email)) {
            // The owner is told, not the caller. Same 202 either way.
            notifier.enqueue(DeliveryChannel.EMAIL, email, "ACCOUNT_EXISTS", null);
            return;
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordHash);
        user.setStatus(UserStatus.PENDING);
        user.setRoles(EnumSet.of(request.role()));
        userRepository.save(user);

        // Same transaction as the account. An account with no profile row is a null check in every
        // screen that follows.
        switch (request.role()) {
            case RIDER -> riderProfileService.createFor(user);
            case DRIVER -> driverProfileService.createFor(user);
            default -> throw new IllegalArgumentException("Accounts of that type cannot be self-registered.");
        }

        issueOtp(user, TokenPurpose.EMAIL_VERIFICATION, "VERIFY_ACCOUNT");
    }

    /** One place that mints a code, stores its hash and queues delivery. */
    private void issueOtp(User user, TokenPurpose purpose, String eventType) {
        String code = OtpGenerator.generate();

        UserToken token = new UserToken();
        token.setUser(user);
        token.setPurpose(purpose);
        token.setTokenHash(passwordEncoder.encode(code));
        token.setDeliveryChannel(DeliveryChannel.EMAIL);
        token.setExpiresAt(Instant.now().plus(OTP_VALIDITY));
        userTokenRepository.save(token);

        // Queued inside this transaction: the code is sent only if the account write commits.
        notifier.enqueue(DeliveryChannel.EMAIL, user.getEmail(), eventType, code);
    }

    /**
     * Finds the live code for an account and checks it. Every guess is counted, right or wrong -
     * a cap that only counts failures is no cap at all.
     */
    private UserToken consumeOtp(String email, String code, TokenPurpose purpose) {
        Instant now = Instant.now();
        BadCredentialsException rejection = new BadCredentialsException("That code is not valid.");

        User user = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> rejection);

        UserToken token = userTokenRepository
                .findFirstByUserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId(), purpose)
                .filter(candidate -> candidate.isRedeemable(now))
                .orElseThrow(() -> rejection);

        token.recordAttempt();
        if (!passwordEncoder.matches(code, token.getTokenHash())) {
            userTokenRepository.save(token);
            throw rejection;
        }

        token.setConsumedAt(now);
        userTokenRepository.save(token);
        return token;
    }

    @Transactional
    public LoginResponse login(LoginRequest request, String userAgent, String ipAddress) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        // Per account, not per IP: the IP filter alone is useless against a botnet grinding one
        // address. Counts failures only, so a legitimate user is never locked out by their own
        // successful logins.
        String failureKey = "rl:login:" + email;
        if (!rateLimiter.tryConsume(failureKey, loginFailureLimit, loginWindow)) {
            authSecurityService.record(null, AuthEventType.LOGIN_BLOCKED, ipAddress, userAgent,
                    "rate limited");
            throw new TooManyRequestsException("Too many sign-in attempts. Try again later.");
        }

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
        // Opaque and random, never a JWT: nothing reads it but a hash lookup, and 256 bits of
        // SecureRandom cannot collide the way a second-granularity timestamp could.
        String refreshTokenValue = VerificationTokenGenerator.generateRawToken();

        // One row per login, not one row per user. The previous code deleted every existing token
        // on each login, so signing in on a phone silently signed the same person out on a tablet.
        Instant now = Instant.now();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(VerificationTokenGenerator.hash(refreshTokenValue));
        refreshToken.setAppContext(app);
        refreshToken.setUserAgent(truncate(userAgent, 255));
        refreshToken.setIpAddress(truncate(ipAddress, 45));
        refreshToken.setLastUsedAt(now);
        refreshToken.setExpiresAt(now.plus(REFRESH_TOKEN_VALIDITY));
        refreshTokenRepository.save(refreshToken);

        user.setLastLoginAt(now);
        userRepository.save(user);

        // Clears the failure count so an earlier fat-fingered password does not shorten the
        // allowance for the rest of the window.
        rateLimiter.reset(failureKey);

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
        String presentedHash = VerificationTokenGenerator.hash(request.refreshToken().trim());
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

        // Read from the row, not from the token. The client cannot promote its own session to a
        // surface it never signed in from.
        AppContext app = storedToken.getAppContext();

        // Re-derived from the account rather than carried forward, so a role removed by operations
        // stops applying at the next refresh instead of surviving for the token's life.
        Set<UserRole> granted = app.grantableFrom(user.getRoles());
        if (granted.isEmpty()) {
            storedToken.setRevokedAt(now);
            refreshTokenRepository.save(storedToken);
            throw new AccessDeniedException(app.rejectionMessage());
        }

        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), granted, app);
        String newRefreshToken = VerificationTokenGenerator.generateRawToken();

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

    /** The caller's live devices, newest first. Scoped to the caller - never takes a user id. */
    @Transactional(readOnly = true)
    public List<SessionResponse> listSessions(String callerUserId, String currentRefreshTokenHash) {
        return refreshTokenRepository.findByUserIdAndRevokedAtIsNullOrderByLastUsedAtDesc(callerUserId)
                .stream()
                .map(token -> new SessionResponse(
                        token.getId(),
                        token.getUserAgent(),
                        token.getIpAddress(),
                        token.getLastUsedAt(),
                        token.getCreatedAt(),
                        token.getTokenHash().equals(currentRefreshTokenHash)))
                .toList();
    }

    /** Revokes one device. Matched on the caller's id, so nobody can end someone else's session. */
    @Transactional
    public void revokeSession(String sessionId, String callerUserId) {
        refreshTokenRepository.findById(sessionId)
                .filter(token -> token.getUser().getId().equals(callerUserId))
                .filter(token -> token.getRevokedAt() == null)
                .ifPresent(token -> {
                    token.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(token);
                    authSecurityService.record(callerUserId, AuthEventType.LOGOUT, null, null,
                            "session revoked from device list");
                });
    }

    /** Unknown address, wrong code, expired code and spent code all get the same answer. */
    @Transactional
    public void verifyEmail(VerifyEmailRequest request) {
        UserToken token = consumeOtp(request.email(), request.code(), TokenPurpose.EMAIL_VERIFICATION);

        User user = token.getUser();
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(Instant.now());
        userRepository.save(user);

        authSecurityService.record(user.getId(), AuthEventType.EMAIL_VERIFIED, null, null, null);
    }

    /** Always succeeds from the caller's side, account or not, or it is a membership oracle. */
    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.email().trim().toLowerCase(Locale.ROOT))
                .ifPresent(user -> {
                    issueOtp(user, TokenPurpose.PASSWORD_RESET, "RESET_PASSWORD");
                    authSecurityService.record(user.getId(), AuthEventType.PASSWORD_RESET_REQUESTED,
                            null, null, null);
                });
    }

    /** Ends every session: a reset that leaves the attacker signed in is no reset. */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        UserToken token = consumeOtp(request.email(), request.code(), TokenPurpose.PASSWORD_RESET);

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        Instant now = Instant.now();
        refreshTokenRepository.revokeAllForUser(user.getId(), now);
        rateLimiter.reset("rl:login:" + user.getEmail());

        authSecurityService.record(user.getId(), AuthEventType.PASSWORD_RESET, null, null, null);
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
