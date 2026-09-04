package com.ridex.dispatch.domain;

public enum OfferStatus {
    OFFERED,
    ACCEPTED,
    REJECTED,
    // Nobody answered in time, or somebody else won it first.
    EXPIRED,
    SUPERSEDED
}
