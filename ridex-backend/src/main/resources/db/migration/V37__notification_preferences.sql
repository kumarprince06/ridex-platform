-- What a person wants to be told about.
--
-- On the server, not only in the app: the server is what decides whether to send, so a preference
-- that lives on the phone is a preference the sender never sees.
CREATE TABLE notification_preferences (
    user_id     VARCHAR(26) PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    push        BOOLEAN NOT NULL DEFAULT TRUE,
    email       BOOLEAN NOT NULL DEFAULT TRUE,
    -- Trip and booking news is not marketing; a rider who turns this off stops hearing about
    -- offers, not about the car they are waiting for.
    promotions  BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
