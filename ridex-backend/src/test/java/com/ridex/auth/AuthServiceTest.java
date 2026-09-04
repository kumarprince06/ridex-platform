package com.ridex.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
import com.ridex.auth.domain.AppContext;
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
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userTokenRepository = mock(UserTokenRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        jwtService = new JwtService("super-secret-key-which-is-very-long-for-jwt-signing", 3600000, 604800000);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        authService = new AuthService(
                userRepository, userTokenRepository, refreshTokenRepository, jwtService, passwordEncoder);
        authService.generateDecoyHash();

        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        when(refreshTokenRepository.save(any())).thenAnswer(call -> call.getArgument(0));
        when(userTokenRepository.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void registersARiderWithoutCreatingATenant() {
        when(userRepository.existsByEmail("rider@example.com")).thenReturn(false);

        String rawToken = authService.register(
                new RegisterRequest("Rider@Example.com ", PASSWORD, UserRole.RIDER));

        assertThat(rawToken).isNotBlank();
        verify(userRepository).save(any(User.class));
        verify(userTokenRepository).save(any());
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

        String token = authService.register(
                new RegisterRequest("taken@example.com", PASSWORD, UserRole.RIDER));

        // No token, no account, and no exception: the controller answers 202 either way, so the
        // caller cannot tell a fresh address from one that already has an account.
        assertThat(token).isNull();
        verify(userRepository, never()).save(any(User.class));
        verify(userTokenRepository, never()).save(any());
    }

    @Test
    void registrationHashesThePasswordEvenWhenTheAddressIsTaken() {
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(any())).thenReturn("hashed");
        AuthService service = new AuthService(
                userRepository, userTokenRepository, refreshTokenRepository, jwtService, encoder);
        service.generateDecoyHash();
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        service.register(new RegisterRequest("taken@example.com", PASSWORD, UserRole.RIDER));

        // Skipping the hash on this path would make it measurably faster than a fresh signup.
        verify(encoder).encode(PASSWORD);
    }

    @Test
    void loginComparesAPasswordEvenWhenTheAddressIsUnknown() {
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(any())).thenReturn("decoy-hash");
        when(encoder.matches(any(), any())).thenReturn(false);
        AuthService service = new AuthService(
                userRepository, userTokenRepository, refreshTokenRepository, jwtService, encoder);
        service.generateDecoyHash();
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(
                new LoginRequest("nobody@example.com", PASSWORD, AppContext.RIDER), null, null))
                .isInstanceOf(BadCredentialsException.class);

        // Returning early on an unknown address is measurable from the internet and enumerates
        // every account on the platform.
        verify(encoder).matches(PASSWORD, "decoy-hash");
    }
}
