package com.ridex.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.ridex.auth.dto.LoginRequest;
import com.ridex.auth.dto.LoginResponse;
import com.ridex.auth.dto.LogoutRequest;
import com.ridex.auth.dto.RegisterRequest;
import com.ridex.driver.DriverProfileService;
import com.ridex.notification.DeliveryChannel;
import com.ridex.notification.Notifier;
import com.ridex.platform.ratelimit.RateLimiter;
import com.ridex.rider.RiderProfileService;
import com.ridex.platform.ratelimit.TooManyRequestsException;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.dto.VerifyEmailRequest;
import com.ridex.auth.dto.ResetPasswordRequest;
import com.ridex.auth.dto.ForgotPasswordRequest;
import com.ridex.auth.domain.UserToken;
import com.ridex.auth.domain.TokenPurpose;
import com.ridex.auth.dto.RefreshTokenRequest;
import com.ridex.auth.domain.AuthEventType;
import com.ridex.auth.domain.RefreshToken;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.platform.security.JwtService;
import com.ridex.shared.util.VerificationTokenGenerator;

import io.jsonwebtoken.Claims;

/**
 * Covers what the B2C pivot changed: registration no longer creates a tenant, and a login is
 * scoped to the app surface it came from.
 */
class AuthServiceTest {

    private static final String PASSWORD = "correct-horse-battery";

    private UserRepository userRepository;
    private UserTokenRepository userTokenRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private JwtService jwtService;
    private AuthSecurityService authSecurityService;
    private RateLimiter rateLimiter;
    private Notifier notifier;
    private RiderProfileService riderProfileService;
    private DriverProfileService driverProfileService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userTokenRepository = mock(UserTokenRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        authSecurityService = mock(AuthSecurityService.class);
        rateLimiter = mock(RateLimiter.class);
        notifier = mock(Notifier.class);
        riderProfileService = mock(RiderProfileService.class);
        driverProfileService = mock(DriverProfileService.class);
        when(rateLimiter.tryConsume(any(), anyInt(), any())).thenReturn(true);
        jwtService = new JwtService("super-secret-key-which-is-very-long-for-jwt-signing", 3600000, 604800000);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        authService = new AuthService(
                userRepository, userTokenRepository, refreshTokenRepository, authSecurityService,
                jwtService, passwordEncoder, rateLimiter, notifier, riderProfileService, driverProfileService);
        authService.generateDecoyHash();

        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        when(refreshTokenRepository.save(any())).thenAnswer(call -> call.getArgument(0));
        when(userTokenRepository.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void registersARiderWithoutCreatingATenant() {
        when(userRepository.existsByEmail("rider@example.com")).thenReturn(false);

        authService.register(
                new RegisterRequest("Rider@Example.com ", PASSWORD, UserRole.RIDER));

        verify(userRepository).save(any(User.class));
        verify(userTokenRepository).save(any());
        verify(notifier).enqueue(eq(DeliveryChannel.EMAIL), eq("rider@example.com"),
                eq("VERIFY_ACCOUNT"), any());
        // Created in the same transaction, so an account can never exist without its profile.
        verify(riderProfileService).createFor(any(User.class));
        verify(driverProfileService, never()).createFor(any());
    }

    @Test
    void refusesToSelfRegisterAStaffRole() {
        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("attacker@example.com", PASSWORD, UserRole.SUPER_ADMIN)))
                .isInstanceOf(IllegalArgumentException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsADriverOnlyAccountSigningIntoTheRiderApp() {
        givenUser(UserStatus.ACTIVE, EnumSet.of(UserRole.DRIVER));

        assertThatThrownBy(() -> login(AppContext.RIDER))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("not registered as a rider");
    }

    @Test
    void grantsOnlyTheRolesTheAppSurfaceNeeds() {
        givenUser(UserStatus.ACTIVE, EnumSet.of(UserRole.RIDER, UserRole.DRIVER));

        LoginResponse response = login(AppContext.DRIVER);

        // One account holds both roles, but a driver-app token must not reach rider endpoints.
        assertThat(response.roles()).containsExactly(UserRole.DRIVER);
        assertThat(response.app()).isEqualTo(AppContext.DRIVER);

        Claims claims = jwtService.parseClaims(response.token());
        @SuppressWarnings("unchecked")
        List<String> roleClaim = claims.get(JwtService.CLAIM_ROLES, List.class);
        assertThat(roleClaim).containsExactly("DRIVER");
        assertThat(claims.get(JwtService.CLAIM_TOKEN_TYPE, String.class)).isEqualTo(JwtService.TOKEN_TYPE_ACCESS);
    }

    @Test
    void refusesLoginForASuspendedAccount() {
        givenUser(UserStatus.SUSPENDED, EnumSet.of(UserRole.RIDER));

        assertThatThrownBy(() -> login(AppContext.RIDER))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("suspended");
    }

    @Test
    void refusesLoginBeforeEmailVerification() {
        givenUser(UserStatus.PENDING, EnumSet.of(UserRole.RIDER));

        assertThatThrownBy(() -> login(AppContext.RIDER))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("verification");
    }

    private void givenUser(UserStatus status, Set<UserRole> roles) {
        User user = new User();
        user.setId("01HZZZZZZZZZZZZZZZZZZZZZZZ");
        user.setEmail("person@example.com");
        user.setPasswordHash(new BCryptPasswordEncoder().encode(PASSWORD));
        user.setStatus(status);
        user.setRoles(EnumSet.copyOf(roles));
        when(userRepository.findByEmail("person@example.com")).thenReturn(Optional.of(user));
    }

    private LoginResponse login(AppContext app) {
        return authService.login(
                new LoginRequest("person@example.com", PASSWORD, app), "JUnit/1.0", "127.0.0.1");
    }

    @Test
    void logoutRevokesTheCallersOwnSession() {
        User owner = activeUser("owner-1");
        RefreshToken session = liveSession(owner, "raw-refresh-token");

        authService.logout(new LogoutRequest("raw-refresh-token"), "owner-1");

        assertThat(session.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(session);
    }

    @Test
    void logoutLeavesAnotherUsersSessionAlone() {
        User someoneElse = activeUser("owner-1");
        RefreshToken session = liveSession(someoneElse, "raw-refresh-token");

        authService.logout(new LogoutRequest("raw-refresh-token"), "attacker-9");

        assertThat(session.getRevokedAt()).isNull();
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void logoutOfAnUnknownTokenIsSilent() {
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        authService.logout(new LogoutRequest("never-issued"), "owner-1");

        verify(refreshTokenRepository, never()).save(any());
    }

    private User activeUser(String id) {
        User user = new User();
        user.setId(id);
        user.setEmail(id + "@example.com");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(UserRole.RIDER));
        return user;
    }

    private RefreshToken liveSession(User owner, String rawToken) {
        RefreshToken session = new RefreshToken();
        session.setUser(owner);
        session.setTokenHash(VerificationTokenGenerator.hash(rawToken));
        session.setExpiresAt(java.time.Instant.now().plusSeconds(3600));
        when(refreshTokenRepository.findByTokenHash(VerificationTokenGenerator.hash(rawToken)))
                .thenReturn(Optional.of(session));
        return session;
    }

    @Test
    void registrationDoesNotRevealThatAnAddressIsTaken() {
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        authService.register(new RegisterRequest("taken@example.com", PASSWORD, UserRole.RIDER));

        // No token, no account, no exception: the controller answers 202 either way.
        verify(userRepository, never()).save(any(User.class));
        verify(userTokenRepository, never()).save(any());
    }

    @Test
    void registrationHashesThePasswordEvenWhenTheAddressIsTaken() {
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(any())).thenReturn("hashed");
        AuthService service = new AuthService(
                userRepository, userTokenRepository, refreshTokenRepository, authSecurityService,
                jwtService, encoder, rateLimiter, notifier, riderProfileService, driverProfileService);
        service.generateDecoyHash();
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        service.register(new RegisterRequest("taken@example.com", PASSWORD, UserRole.RIDER));

        // Skipping the hash here would make this path measurably faster than a fresh signup.
        verify(encoder).encode(PASSWORD);
    }

    @Test
    void loginComparesAPasswordEvenWhenTheAddressIsUnknown() {
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(any())).thenReturn("decoy-hash");
        when(encoder.matches(any(), any())).thenReturn(false);
        AuthService service = new AuthService(
                userRepository, userTokenRepository, refreshTokenRepository, authSecurityService,
                jwtService, encoder, rateLimiter, notifier, riderProfileService, driverProfileService);
        service.generateDecoyHash();
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(
                new LoginRequest("nobody@example.com", PASSWORD, AppContext.RIDER), null, null))
                .isInstanceOf(BadCredentialsException.class);

        // An early return here is measurable and enumerates every account.
        verify(encoder).matches(PASSWORD, "decoy-hash");
    }

    @Test
    void replayingASpentRefreshTokenTriggersTheTheftResponse() {
        User owner = activeUser("owner-1");
        RefreshToken session = new RefreshToken();
        session.setUser(owner);
        session.setTokenHash(VerificationTokenGenerator.hash("current-secret"));
        session.setPreviousTokenHash(VerificationTokenGenerator.hash("spent-secret"));
        session.setExpiresAt(java.time.Instant.now().plusSeconds(3600));

        String spentToken = jwtService.generateRefreshToken(
                "owner-1", "owner-1@example.com", EnumSet.of(UserRole.RIDER), AppContext.RIDER);
        session.setPreviousTokenHash(VerificationTokenGenerator.hash(spentToken));

        when(refreshTokenRepository.findByTokenHash(VerificationTokenGenerator.hash(spentToken)))
                .thenReturn(Optional.empty());
        when(refreshTokenRepository.findByPreviousTokenHash(VerificationTokenGenerator.hash(spentToken)))
                .thenReturn(Optional.of(session));

        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest(spentToken)))
                .isInstanceOf(BadCredentialsException.class);

        // No way to tell which party is the owner, so every session ends.
        verify(authSecurityService).respondToTokenReuse(eq("owner-1"), any());
    }

    @Test
    void anUnknownRefreshTokenIsNotTreatedAsTheft() {
        String strangerToken = jwtService.generateRefreshToken(
                "nobody", "nobody@example.com", EnumSet.of(UserRole.RIDER), AppContext.RIDER);
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());
        when(refreshTokenRepository.findByPreviousTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest(strangerToken)))
                .isInstanceOf(BadCredentialsException.class);

        verify(authSecurityService, never()).respondToTokenReuse(any(), any());
    }

    @Test
    void rotationKeepsTheOutgoingHashSoAReplayIsDetectable() {
        RefreshToken session = new RefreshToken();
        session.setTokenHash("first-hash");
        session.setExpiresAt(java.time.Instant.now().plusSeconds(3600));

        java.time.Instant now = java.time.Instant.now();
        session.rotateTo("second-hash", now, now.plusSeconds(3600));

        assertThat(session.getTokenHash()).isEqualTo("second-hash");
        assertThat(session.getPreviousTokenHash()).isEqualTo("first-hash");
    }

    @Test
    void aFailedLoginIsRecordedEvenThoughTheRequestThenFails() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("nobody@example.com", PASSWORD, AppContext.RIDER), "agent", "1.2.3.4"))
                .isInstanceOf(BadCredentialsException.class);

        // Null user id on purpose: that row is what credential stuffing looks like.
        verify(authSecurityService).record(
                eq(null), eq(AuthEventType.LOGIN_FAILED), eq("1.2.3.4"), eq("agent"), any());
    }

    @Test
    void aFloodOfFailedLoginsIsBlockedBeforeTheDatabaseIsTouched() {
        when(rateLimiter.tryConsume(eq("rl:login:target@example.com"), anyInt(), any()))
                .thenReturn(false);

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("target@example.com", PASSWORD, AppContext.RIDER), "agent", "1.2.3.4"))
                .isInstanceOf(TooManyRequestsException.class);

        // Blocked before the lookup, so grinding one address costs the attacker nothing of ours.
        verify(userRepository, never()).findByEmail(any());
    }

    @Test
    void aSuccessfulLoginClearsTheFailureCount() {
        User user = activeUser("owner-1");
        user.setPasswordHash(new BCryptPasswordEncoder().encode(PASSWORD));
        when(userRepository.findByEmail("owner-1@example.com")).thenReturn(Optional.of(user));

        authService.login(
                new LoginRequest("owner-1@example.com", PASSWORD, AppContext.RIDER), "agent", "1.2.3.4");

        verify(rateLimiter).reset("rl:login:owner-1@example.com");
    }

    @Test
    void theRightCodeActivatesTheAccount() {
        User user = pendingUser("owner-1");
        UserToken token = liveOtp(user, "418302", TokenPurpose.EMAIL_VERIFICATION);

        authService.verifyEmail(new VerifyEmailRequest("owner-1@example.com", "418302"));

        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getEmailVerifiedAt()).isNotNull();
        assertThat(token.getConsumedAt()).isNotNull();
    }

    @Test
    void aWrongCodeIsCountedAgainstTheAttemptCap() {
        User user = pendingUser("owner-1");
        UserToken token = liveOtp(user, "418302", TokenPurpose.EMAIL_VERIFICATION);

        assertThatThrownBy(() -> authService.verifyEmail(
                new VerifyEmailRequest("owner-1@example.com", "000000")))
                .isInstanceOf(BadCredentialsException.class);

        // Counting only successes would leave a million guesses available.
        assertThat(token.getAttempts()).isEqualTo((short) 1);
        assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING);
    }

    @Test
    void aCodeStopsWorkingOnceTheAttemptCapIsReached() {
        User user = pendingUser("owner-1");
        UserToken token = liveOtp(user, "418302", TokenPurpose.EMAIL_VERIFICATION);
        token.setAttempts(UserToken.MAX_ATTEMPTS);

        // Even the correct code: five wrong guesses burn it, or the cap can be waited out.
        assertThatThrownBy(() -> authService.verifyEmail(
                new VerifyEmailRequest("owner-1@example.com", "418302")))
                .isInstanceOf(BadCredentialsException.class);

        assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING);
    }

    @Test
    void aSpentCodeCannotBeUsedAgain() {
        User user = pendingUser("owner-1");
        UserToken token = liveOtp(user, "418302", TokenPurpose.EMAIL_VERIFICATION);
        token.setConsumedAt(java.time.Instant.now());

        assertThatThrownBy(() -> authService.verifyEmail(
                new VerifyEmailRequest("owner-1@example.com", "418302")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void forgotPasswordIsSilentAndSendsNothingForAnUnknownAddress() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        authService.requestPasswordReset(new ForgotPasswordRequest("nobody@example.com"));

        verify(userTokenRepository, never()).save(any());
        verify(notifier, never()).enqueue(any(), any(), any(), any());
    }

    @Test
    void resettingAPasswordEndsEverySession() {
        User user = activeUser("owner-1");
        liveOtp(user, "418302", TokenPurpose.PASSWORD_RESET);

        authService.resetPassword(
                new ResetPasswordRequest("owner-1@example.com", "418302", "a-new-password"));

        // A reset that leaves the attacker signed in is not a reset.
        verify(refreshTokenRepository).revokeAllForUser(eq("owner-1"), any());
        assertThat(new BCryptPasswordEncoder().matches("a-new-password", user.getPasswordHash()))
                .isTrue();
    }

    @Test
    void aVerificationCodeIsNotRedeemableAsAPasswordReset() {
        User user = activeUser("owner-1");
        liveOtp(user, "418302", TokenPurpose.EMAIL_VERIFICATION);
        // Looked up by account *and* purpose, so a reset finds no code at all.
        when(userTokenRepository.findFirstByUserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                "owner-1", TokenPurpose.PASSWORD_RESET)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword(
                new ResetPasswordRequest("owner-1@example.com", "418302", "a-new-password")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void aSessionBelongingToSomeoneElseCannotBeRevoked() {
        User owner = activeUser("owner-1");
        RefreshToken session = new RefreshToken();
        session.setUser(owner);
        session.setExpiresAt(java.time.Instant.now().plusSeconds(3600));
        when(refreshTokenRepository.findById("session-1")).thenReturn(Optional.of(session));

        authService.revokeSession("session-1", "attacker-9");

        assertThat(session.getRevokedAt()).isNull();
    }

    private User pendingUser(String id) {
        User user = activeUser(id);
        user.setStatus(UserStatus.PENDING);
        return user;
    }

    private UserToken liveOtp(User user, String code, TokenPurpose purpose) {
        UserToken token = new UserToken();
        token.setUser(user);
        token.setPurpose(purpose);
        token.setTokenHash(new BCryptPasswordEncoder().encode(code));
        token.setExpiresAt(java.time.Instant.now().plusSeconds(600));
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(userTokenRepository.findFirstByUserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                user.getId(), purpose)).thenReturn(Optional.of(token));
        return token;
    }
}
