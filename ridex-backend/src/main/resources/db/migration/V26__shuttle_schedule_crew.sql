-- The regular crew of a scheduled departure.
--
-- A driver could only be attached to a materialised trip, and a trip only exists once somebody
-- books it - so the first rider on every departure booked a seat on a bus with no driver and no
-- registration to look for. The crew belongs to the timetable: the same driver runs the 08:15
-- every weekday. Per-date reassignment still lands on shuttle_trips, which is what a swap is.

ALTER TABLE shuttle_schedules
    ADD COLUMN driver_id  VARCHAR(26),
    ADD COLUMN vehicle_id VARCHAR(26);

ALTER TABLE shuttle_schedules
    ADD CONSTRAINT fk_shuttle_schedules_driver
        FOREIGN KEY (driver_id) REFERENCES driver_profiles (id),
    ADD CONSTRAINT fk_shuttle_schedules_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES driver_vehicles (id);
