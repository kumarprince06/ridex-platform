package com.ridex.ride.domain;

/**
 * Why a rider cancelled, as a code rather than free text.
 *
 * <p>Free text alone could not be counted: "driver was miles away", "he's too far" and "driver far"
 * are one operational problem written three ways, and nobody can act on a list of sentences. The
 * text is still taken for OTHER, which is where the reasons nobody predicted show up - and reading
 * those is how this list grows.
 */
public enum CancellationReason {

    DRIVER_TOO_FAR("Driver is too far"),
    WAITING_TOO_LONG("Waiting too long"),
    DRIVER_NOT_MOVING("Driver is not moving"),
    WRONG_VEHICLE_DETAILS("Wrong vehicle details"),
    FOUND_ANOTHER_RIDE("Found another ride"),
    PLANS_CHANGED("My plans changed"),
    WRONG_PICKUP("Wrong pickup location"),
    DRIVER_ASKED_TO_CANCEL("Driver asked me to cancel"),
    OTHER("Something else");

    private final String label;

    CancellationReason(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** OTHER is the only one that means nothing on its own, so it is the only one that needs words. */
    public boolean needsDetail() {
        return this == OTHER;
    }
}
