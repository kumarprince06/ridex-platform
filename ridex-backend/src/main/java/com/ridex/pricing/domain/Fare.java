package com.ridex.pricing.domain;

import java.util.List;

import com.ridex.shared.money.Money;

/** A quoted fare: its lines, and the total they add up to. */
public record Fare(List<FareLine> lines, Money total) {

    public Fare {
        lines = List.copyOf(lines);
    }
}
