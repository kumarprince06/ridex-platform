package com.ridex.shuttle.dto;

/** A route's passes at a glance: on sale or not, the monthly price, and riders holding one now. */
public record RoutePassSummary(String routeId, String routeName, boolean onSale, Long monthlyPriceMinor,
        long activePasses) {
}
