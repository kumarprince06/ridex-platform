package com.ridex.platform.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumSet;

import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;

class JwtAuthenticationFilterTest {

    private final JwtService jwtService =
            new JwtService("super-secret-key-which-is-very-long-for-jwt-signing", 3600000);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService);

    @Test
    void authenticatesWithTheRolesGrantedForTheSurface() throws Exception {
        String token = jwtService.generateAccessToken(
                "user-1", "driver@example.com", EnumSet.of(UserRole.DRIVER), AppContext.DRIVER);

        Authentication[] seen = new Authentication[1];
        MockFilterChain chain = new MockFilterChain() {
            @Override
            public void doFilter(ServletRequest req, ServletResponse res) {
                seen[0] = SecurityContextHolder.getContext().getAuthentication();
            }
        };

        MockHttpServletResponse response = call(token, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(seen[0]).isNotNull();
        assertThat(seen[0].getAuthorities()).extracting(Object::toString).containsExactly("ROLE_DRIVER");
        assertThat(((JwtPrincipal) seen[0].getPrincipal()).app()).isEqualTo(AppContext.DRIVER);

        // Stateless: nothing may leak to the next request on this thread.
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void rejectsAJwtThatIsNotAnAccessToken() throws Exception {
        // Refresh tokens are opaque now, so this guards against a forged or legacy JWT claiming
        // to be one - which would otherwise authenticate for the refresh token's full week.
        String refreshToken = jwtService.buildToken(
                "user-1", "driver@example.com", EnumSet.of(UserRole.DRIVER), AppContext.DRIVER,
                604800000L, JwtService.TOKEN_TYPE_REFRESH);

        boolean[] chainRan = {false};
        MockFilterChain chain = new MockFilterChain() {
            @Override
            public void doFilter(ServletRequest req, ServletResponse res) {
                chainRan[0] = true;
            }
        };

        MockHttpServletResponse response = call(refreshToken, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(chainRan[0]).isFalse();
    }

    @Test
    void rejectsATokenSignedWithAnotherKey() throws Exception {
        JwtService otherIssuer =
                new JwtService("a-completely-different-key-of-sufficient-length!!", 3600000);
        String forged = otherIssuer.generateAccessToken(
                "user-1", "attacker@example.com", EnumSet.of(UserRole.SUPER_ADMIN), AppContext.ADMIN);

        MockHttpServletResponse response = call(forged, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
    }

    private MockHttpServletResponse call(String token, MockFilterChain chain) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        return response;
    }
}
