package com.ridex.auth;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.domain.AuthEvent;
import com.ridex.auth.domain.AuthEventType;

import lombok.RequiredArgsConstructor;

// Every event worth recording is on a path that then throws, so these must commit on their own
// transaction or the rollback erases them. A separate bean because self-invocation skips the proxy.
@Service
@RequiredArgsConstructor
public class AuthSecurityService {

    private final AuthEventRepository authEventRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String userId, AuthEventType type, String ipAddress, String userAgent,
            String detail) {
        AuthEvent event = new AuthEvent();
        event.setUserId(userId);
        event.setEventType(type);
        event.setIpAddress(truncate(ipAddress, 45));
        event.setUserAgent(truncate(userAgent, 255));
        event.setDetail(truncate(detail, 500));
        authEventRepository.save(event);
    }

    // Two parties hold that secret and the server cannot tell which is the owner, so all sessions end.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void respondToTokenReuse(String userId, Instant now) {
        int revoked = refreshTokenRepository.revokeAllForUser(userId, now);

        record(userId, AuthEventType.REFRESH_TOKEN_REUSED, null, null,
                "spent refresh token replayed; revoked " + revoked + " session(s)");
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
