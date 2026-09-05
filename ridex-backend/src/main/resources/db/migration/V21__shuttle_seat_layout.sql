-- Seats per row, chosen per departure.
--
-- SeatMap hardcoded four across. That is right for a minibus and wrong for everything else: a
-- 2+1 coach, a six-seat MPV and an auto rickshaw all label their seats differently, and a rider
-- picking "4D" on a vehicle whose rows end at C is picking a seat that does not exist.

ALTER TABLE shuttle_schedules
    ADD COLUMN seats_per_row SMALLINT NOT NULL DEFAULT 4;

-- Four is the practical ceiling for A-D labelling; one is a single-file shuttle.
ALTER TABLE shuttle_schedules
    ADD CONSTRAINT ck_shuttle_schedules_seats_per_row CHECK (seats_per_row BETWEEN 1 AND 4);

-- Materialised departures keep the layout they were sold under. A seat map that changes after a
-- booking would move somebody who already paid for 3C.
ALTER TABLE shuttle_trips
    ADD COLUMN seats_per_row SMALLINT NOT NULL DEFAULT 4;
