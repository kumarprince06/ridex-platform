-- Where a rider goes often enough to name.
--
-- Label rather than a fixed home/work pair: "Mum's", "the gym" and "site office" are the same
-- thing to the app, and a schema that only knows two of them forces the third into the wrong slot.
CREATE TABLE saved_places (
    id         VARCHAR(26)  PRIMARY KEY,
    rider_id   VARCHAR(26)  NOT NULL REFERENCES rider_profiles (id) ON DELETE CASCADE,
    label      VARCHAR(60)  NOT NULL,
    address    VARCHAR(255) NOT NULL,
    latitude   NUMERIC(9, 6) NOT NULL,
    longitude  NUMERIC(9, 6) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- One label per rider: saving "Home" twice is an edit, not a second home.
CREATE UNIQUE INDEX uk_saved_places_label ON saved_places (rider_id, LOWER(label));
