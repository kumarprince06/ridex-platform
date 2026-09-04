package com.ridex.pricing.domain;

// The vocabulary of a fare. Adding a kind of charge means adding a value here, not a column.
public enum FareLineType {
    BASE,
    DISTANCE,
    TIME,
    // Charged only past the free allowance, and only from the driver's recorded arrival.
    WAITING,
    SURGE,
    // Negative amounts. Kept as their own lines so the rider can see what was taken off and why.
    DISCOUNT,
    TOLL,
    TAX,
    // Raises the total to the minimum fare. A line rather than a silent adjustment, or a short
    // trip looks like the maths is wrong.
    MINIMUM_FARE_ADJUSTMENT
}
