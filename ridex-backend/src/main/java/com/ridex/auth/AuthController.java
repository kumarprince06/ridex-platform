package com.ridex.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.auth.dto.LoginRequest;
import com.ridex.auth.dto.LoginResponse;
import com.ridex.auth.dto.LogoutRequest;
import com.ridex.auth.dto.AuthEventResponse;
import com.ridex.auth.dto.ChangePasswordRequest;
import com.ridex.auth.dto.ForgotPasswordRequest;
import com.ridex.auth.dto.RefreshTokenRequest;
import com.ridex.auth.dto.RefreshTokenResponse;
import com.ridex.auth.dto.RegisterRequest;
import com.ridex.auth.dto.RegisterResponse;
import com.ridex.auth.dto.ResetPasswordRequest;
import com.ridex.auth.dto.SessionResponse;
import com.ridex.auth.dto.VerifyEmailRequest;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.shared.util.VerificationTokenGenerator;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Auth")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 202 rather than 201: the account exists but is unusable until the email is verified, so the
     * work this request started is not finished when the response is written.
     */
    @Operation(summary = "Register a rider or driver account and email a verification code")
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return new RegisterResponse("Registration received. Check your email for a 6-digit code.");
    }

    @Operation(summary = "Sign in and get an access token and a refresh token")
    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(
                request,
                httpRequest.getHeader(HttpHeaders.USER_AGENT),
                clientIp(httpRequest));
    }

    @Operation(summary = "Swap a refresh token for a new token pair")
    @PostMapping("/refresh")
    @ResponseStatus(HttpStatus.OK)
    public RefreshTokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request);
    }

    /**
     * Authenticated, unlike the other auth routes: revoking a session means proving you own it.
     * The token is matched against the caller's own id, so a stolen refresh token cannot be used
     * to sign someone else out.
     */
    @Operation(summary = "Sign out by revoking this refresh token")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest request,
            @AuthenticationPrincipal JwtPrincipal principal) {
        authService.logout(request, principal.userId());
    }

    @Operation(summary = "Verify an email address with the emailed code")
    @PostMapping("/verify")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request);
    }

    // Always 202, account or not. Anything else confirms which addresses are registered.
    @Operation(summary = "Email a password reset code")
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RegisterResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request);
        return new RegisterResponse("If that address has an account, a reset code is on its way.");
    }

    @Operation(summary = "Reset a password with the emailed code")
    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
    }

    /** Changing a password from inside the app. Ends every other session by design. */
    @Operation(summary = "Change the password and end every other session")
    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal.userId(), request);
    }

    /** This account's own login history - what happened, from where, and when. */
    @Operation(summary = "List this account's sign-in history")
    @GetMapping("/login-history")
    @ResponseStatus(HttpStatus.OK)
    public List<AuthEventResponse> loginHistory(@AuthenticationPrincipal JwtPrincipal principal) {
        return authService.loginHistory(principal.userId());
    }

    @Operation(summary = "List this account's active sessions")
    @GetMapping("/sessions")
    @ResponseStatus(HttpStatus.OK)
    public List<SessionResponse> sessions(@AuthenticationPrincipal JwtPrincipal principal,
            HttpServletRequest httpRequest) {
        // The access token cannot identify the session row, so "current" is only marked when the
        // client passes its refresh token back. Absent, every row simply reads as not current.
        String presented = httpRequest.getHeader("X-Refresh-Token");
        String hash = presented == null || presented.isBlank()
                ? ""
                : VerificationTokenGenerator.hash(presented.trim());
        return authService.listSessions(principal.userId(), hash);
    }

    @Operation(summary = "Revoke one of this account's sessions")
    @DeleteMapping("/sessions/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeSession(@PathVariable String sessionId,
            @AuthenticationPrincipal JwtPrincipal principal) {
        authService.revokeSession(sessionId, principal.userId());
    }

    /**
     * ponytail: trusts X-Forwarded-For's first hop. Correct only behind a proxy that overwrites the
     * header - a client can otherwise set it freely. Swap for Spring's ForwardedHeaderFilter with a
     * trusted-proxy list once the deployment topology is fixed.
     */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.isBlank()) {
            return request.getRemoteAddr();
        }
        return forwarded.split(",")[0].trim();
    }

}
