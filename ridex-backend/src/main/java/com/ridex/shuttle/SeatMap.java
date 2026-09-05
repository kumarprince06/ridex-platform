package com.ridex.shuttle;

import java.util.ArrayList;
import java.util.List;

/**
 * Seat labels for a shuttle.
 *
 * <p>Lettered A onwards across, numbered from the front - the layout every bus passenger already
 * understands. Generated rather than stored: the labels are a function of capacity and row width,
 * and a seats table would be rows to keep in step with two numbers that never change after the
 * first booking.
 */
public final class SeatMap {

    private static final char[] COLUMNS = {'A', 'B', 'C', 'D'};

    /** What a schedule gets when nobody chose: a minibus, four across. */
    public static final short DEFAULT_SEATS_PER_ROW = 4;

    private SeatMap() {
    }

    public static List<String> labelsFor(int capacity, int seatsPerRow) {
        int width = clampWidth(seatsPerRow);
        List<String> labels = new ArrayList<>(capacity);
        for (int index = 0; index < capacity; index++) {
            int row = index / width + 1;
            labels.add(row + String.valueOf(COLUMNS[index % width]));
        }
        return labels;
    }

    public static boolean isValid(String label, int capacity, int seatsPerRow) {
        return labelsFor(capacity, seatsPerRow).contains(label);
    }

    /**
     * Defends against a row width outside A-D.
     *
     * <p>The CHECK constraint says 1..4, but a row read before that migration ran, or a caller
     * passing a raw 0, would index past COLUMNS and take down the seat picker rather than the
     * request that caused it.
     */
    private static int clampWidth(int seatsPerRow) {
        return Math.min(Math.max(1, seatsPerRow), COLUMNS.length);
    }
}
