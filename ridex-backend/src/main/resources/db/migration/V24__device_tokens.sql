-- Push targets, one row per device a person has signed in on.
--
-- Both clients are Expo apps, so these are Expo push tokens rather than raw FCM/APNs ones: Expo
-- brokers to both stores from one token, which is what makes push possible without a Firebase
-- project and a signing key per platform.

CREATE TABLE device_tokens (
    id          VARCHAR(26)  PRIMARY KEY,
    user_id     VARCHAR(26)  NOT NULL,

    token       VARCHAR(255) NOT NULL,
    platform    VARCHAR(20)  NOT NULL,

    -- Which app the token came from. The same person can be a rider on one device and a driver on
    -- another, and a shuttle boarding notice must not land on the driver's phone.
    app_context VARCHAR(20)  NOT NULL,

    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- A token is the device, not the person: reinstalling gives a new one, and signing in as
    -- somebody else on the same phone must move the token rather than duplicate it.
    CONSTRAINT uk_device_tokens_token UNIQUE (token),
    CONSTRAINT fk_device_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_device_tokens_user ON device_tokens (user_id, app_context);
