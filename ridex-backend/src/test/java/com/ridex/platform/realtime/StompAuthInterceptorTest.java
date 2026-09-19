package com.ridex.platform.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Set;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.platform.security.JwtService;

class StompAuthInterceptorTest {

    private final JwtService jwtService = mock(JwtService.class);
    @SuppressWarnings("unchecked")
    private final ObjectProvider<SubscriptionGuard> guards = mock(ObjectProvider.class);
    private final StompAuthInterceptor interceptor = new StompAuthInterceptor(jwtService, guards);
    private final MessageChannel channel = mock(MessageChannel.class);
    private final JwtPrincipal rider = new JwtPrincipal("user-1", "a@b.c", Set.of(UserRole.RIDER), AppContext.RIDER);

    @Test
    void connectingWithoutATokenIsRefused() {
        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.CONNECT, null, null), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void aGuardCanRefuseASubscription() {
        when(guards.orderedStream()).thenReturn(Stream.of((userId, destination) ->
                destination.endsWith("/mine") ? Boolean.TRUE : Boolean.FALSE));

        Message<?> mine = frame(StompCommand.SUBSCRIBE, "/topic/shuttle-trips/mine", rider);
        assertThat(interceptor.preSend(mine, channel)).isSameAs(mine);

        when(guards.orderedStream()).thenReturn(Stream.of((userId, destination) ->
                destination.endsWith("/mine") ? Boolean.TRUE : Boolean.FALSE));
        assertThatThrownBy(() -> interceptor.preSend(
                frame(StompCommand.SUBSCRIBE, "/topic/shuttle-trips/someone-else", rider), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void anUnauthenticatedSubscribeIsRefused() {
        assertThatThrownBy(() -> interceptor.preSend(
                frame(StompCommand.SUBSCRIBE, "/topic/shuttle-trips/x", null), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    private static Message<?> frame(StompCommand command, String destination, JwtPrincipal user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (user != null) {
            accessor.setUser(user.toAuthentication());
        }
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
