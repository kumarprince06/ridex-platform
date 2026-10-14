package com.ridex.dispatch;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import com.ridex.auth.domain.UserRole;
import com.ridex.dispatch.dto.LocationRequest;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.shared.exception.DomainException;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Location pings over the driver's open socket: SEND to /app/driver/location.
 *
 * <p>The same work as POST /api/v1/driver/location, without a request, a TLS handshake and a JWT
 * check every five seconds. The HTTP endpoint stays, because the shipped driver app uses it.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class DriverLocationSocket {

    private final DriverDutyService driverDutyService;

    @MessageMapping("/driver/location")
    public void report(@Valid @Payload LocationRequest request, Principal principal) {
        driverDutyService.reportLocation(driverUserId(principal), request);
    }

    /**
     * Answered on the sender's own error queue, never broadcast. A frame has no response to carry
     * a status code, and silently dropping a bad ping hides a broken client.
     */
    @MessageExceptionHandler
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public SocketError onError(Exception ex) {
        String message = switch (ex) {
            case MethodArgumentNotValidException invalid -> "That location is not valid.";
            case AccessDeniedException denied -> denied.getMessage();
            case DomainException domain -> domain.getMessage();
            default -> {
                log.warn("Socket location ping failed", ex);
                yield "Could not record that location.";
            }
        };
        return new SocketError(message);
    }

    // Default deny: only a signed-in driver may move a pin. A rider's socket is refused here
    // rather than discovered by a missing profile further down.
    private static String driverUserId(Principal principal) {
        if (principal instanceof Authentication auth
                && auth.getPrincipal() instanceof JwtPrincipal user
                && user.roles().contains(UserRole.DRIVER)) {
            return user.userId();
        }
        throw new AccessDeniedException("Only a driver can report a location.");
    }

    public record SocketError(String message) {
    }
}
