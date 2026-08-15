package com.ridex.api.controller.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.api.dto.auth.RegisterRequest;
import com.ridex.api.dto.auth.RegisterResponse;
import com.ridex.application.auth.AuthService;

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

}
