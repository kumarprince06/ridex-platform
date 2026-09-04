package com.ridex.trip.domain;

public enum ActorType {
    RIDER,
    DRIVER,
    // Timeouts and sweeps. The actor people argue about, so it gets a name rather than a null.
    SYSTEM,
    ADMIN
}
