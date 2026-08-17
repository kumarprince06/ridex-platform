package com.ridex.api.controller.auth;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.api.dto.auth.LoginRequest;
import com.ridex.api.dto.auth.LoginResponse;
import com.ridex.api.dto.auth.RefreshTokenRequest;
import com.ridex.api.dto.auth.RefreshTokenResponse;
import com.ridex.api.dto.auth.RegisterRequest;
import com.ridex.api.dto.auth.RegisterResponse;
import com.ridex.application.auth.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 202 rather than 201: the account exists but is unusable until the email is verified, so the
     * work this request started is not finished when the response is written.
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return new RegisterResponse("Registration received. Check your email to verify your account.");
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(
                request,
                httpRequest.getHeader(HttpHeaders.USER_AGENT),
                clientIp(httpRequest));
    }

    @PostMapping("/refresh")
    @ResponseStatus(HttpStatus.OK)
    public RefreshTokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request);
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
