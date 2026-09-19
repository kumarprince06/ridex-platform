package com.ridex.platform.realtime;

/**
 * Lets a module decide who may subscribe to its own topics, without the WebSocket layer
 * having to know about shuttles, rides and so on.
 */
public interface SubscriptionGuard {

    /** Null if this guard doesn't own the destination; otherwise whether the user may subscribe. */
    Boolean allows(String userId, String destination);
}
