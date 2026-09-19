package com.ridex.shuttle.dto;

/** The live departure plus where this rider gets on and off, so the app can count stops away. */
public record BookingLiveResponse(ShuttleLiveResponse trip, short boardingSequence, short alightingSequence) {
}
