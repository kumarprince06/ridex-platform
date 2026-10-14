package com.ridex.platform.realtime;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.platform.security.JwtService;

import lombok.RequiredArgsConstructor;

/**
 * Auth for the socket. Mobile WebSocket clients can't set headers reliably on the handshake, so
 * the token comes in the STOMP CONNECT frame instead, and every SUBSCRIBE is checked.
 */
@Component
@RequiredArgsConstructor
public class StompAuthInterceptor implements ChannelInterceptor {

    static final String APP_PREFIX = "/app/";

    private final JwtService jwtService;
    // Looked up per subscribe: the guards need the messaging template, which is built after this.
    private final ObjectProvider<SubscriptionGuard> guards;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (accessor.getCommand() == StompCommand.CONNECT) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new AccessDeniedException("Sign in to connect.");
            }
            try {
                accessor.setUser(jwtService.accessPrincipal(header.substring(7).trim()).toAuthentication());
            } catch (RuntimeException ex) {
                throw new AccessDeniedException("Invalid or expired token.");
            }
        }

        if (accessor.getCommand() == StompCommand.SEND) {
            if (!(accessor.getUser() instanceof Authentication auth)
                    || !(auth.getPrincipal() instanceof JwtPrincipal)) {
                throw new AccessDeniedException("Sign in to send.");
            }
            // Clients talk to the application, never straight to the broker: a SEND to /topic/...
            // would let any socket put words - or a fake car position - in another rider's feed.
            String destination = accessor.getDestination();
            if (destination == null || !destination.startsWith(APP_PREFIX)) {
                throw new AccessDeniedException("You can't send to that.");
            }
        }

        if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            if (!(accessor.getUser() instanceof Authentication auth)
                    || !(auth.getPrincipal() instanceof JwtPrincipal principal)) {
                throw new AccessDeniedException("Sign in to subscribe.");
            }
            String destination = accessor.getDestination();
            // The simple broker matches patterns, so "/topic/**" would receive every topic while no
            // guard recognises it as theirs. Only exact destinations can be checked.
            if (destination == null || destination.contains("*") || destination.contains("{")) {
                throw new AccessDeniedException("You can't follow that.");
            }
            boolean refused = guards.orderedStream()
                    .map(guard -> guard.allows(principal.userId(), destination))
                    .anyMatch(Boolean.FALSE::equals);
            if (refused) {
                throw new AccessDeniedException("You can't follow that.");
            }
        }
        return message;
    }
}
