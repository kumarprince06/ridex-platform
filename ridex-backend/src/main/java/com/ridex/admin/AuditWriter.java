package com.ridex.admin;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.admin.domain.AuditLog;
import com.ridex.platform.security.JwtPrincipal;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

/**
 * REQUIRES_NEW, like every other record that has to outlive its caller's transaction.
 *
 * <p>Third time this pattern has been needed: audit rows, failed-login events and pickup-code
 * attempts all die if written on a transaction that later rolls back.
 */
@Service
@RequiredArgsConstructor
public class AuditWriter {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void write(String action, String targetType, String targetId, String reason,
            JwtPrincipal actor, HttpServletRequest request) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setTargetType(targetType.isBlank() ? null : targetType);
        log.setTargetId(targetId);
        log.setReason(truncate(reason, 500));

        if (actor != null) {
            log.setActorUserId(actor.userId());
            log.setActorEmail(actor.email());
        }
        if (request != null) {
            log.setIpAddress(truncate(request.getRemoteAddr(), 45));
            log.setUserAgent(truncate(request.getHeader(HttpHeaders.USER_AGENT), 255));
        }

        auditLogRepository.save(log);
    }

    private static String truncate(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max);
    }
}
