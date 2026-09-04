package com.ridex.platform.security;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Without this Spring falls back to Http403ForbiddenEntryPoint, so a request with no credentials
// gets 403 - which tells the client "you may not", when the truth is "you did not say who you are".
public class ProblemAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException authException) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.getWriter().write(
                "{\"status\":401,\"title\":\"Unauthorized\","
                + "\"detail\":\"Authentication is required for this endpoint.\"}");
    }
}
