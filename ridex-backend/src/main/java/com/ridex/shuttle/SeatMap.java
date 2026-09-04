package com.ridex.shuttle;

import java.util.ArrayList;
import java.util.List;

/**
 * Seat labels for a shuttle.
 *
 * <p>Four across, lettered A to D, numbered from the front - the layout every minibus passenger
 * already understands. Generated rather than stored: the labels are a function of capacity, and a
 * seats table would be rows to keep in step with a number that never changes.
 */
public final class SeatMap {

    private static final char[] COLUMNS = {'A', 'B', 'C', 'D'};

    private SeatMap() {
    }

    public static List<String> labelsFor(int capacity) {
        List<String> labels = new ArrayList<>(capacity);
        for (int index = 0; index < capacity; index++) {
            int row = index / COLUMNS.length + 1;
            labels.add(row + String.valueOf(COLUMNS[index % COLUMNS.length]));
        }
        return labels;
    }

    public static boolean isValid(String label, int capacity) {
        return labelsFor(capacity).contains(label);
    }
}
