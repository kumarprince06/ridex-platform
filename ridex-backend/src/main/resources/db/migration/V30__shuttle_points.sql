-- Points, spendable on a seat.
--
-- A cancelled seat is credited back in points, and until now those points could only be spent on
-- an on-demand ride - so the commuter who cancels a shuttle could not put the credit back into
-- the shuttle. The two sides of the same feature have to meet.

ALTER TABLE shuttle_bookings
    ADD COLUMN redeemed_points INTEGER NOT NULL DEFAULT 0,
    -- What those points took off. Stored, so a ticket and its invoice still say what was charged
    -- if the redemption rate ever changes.
    ADD COLUMN discount_minor  BIGINT  NOT NULL DEFAULT 0;
