package com.ridex.ride.dto;

import jakarta.validation.constraints.Size;

// Free text: a fixed reason list makes people pick the nearest lie, and the real reason is what
// operations needs to see.
public record CancelRideRequest(@Size(max = 500) String reason) {
}
