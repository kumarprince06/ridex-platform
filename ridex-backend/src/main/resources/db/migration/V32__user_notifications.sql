-- The feed a person sees in the app.
--
-- Separate from notification_outbox on purpose: the outbox is a delivery queue whose rows are
-- dispatched and then dead, while this is history somebody scrolls back through. One table would
-- have to be both, and the pruning rules are opposite.
CREATE TABLE user_notifications (
    id          VARCHAR(26)  PRIMARY KEY,
    user_id     VARCHAR(26)  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_type  VARCHAR(60)  NOT NULL,
    title       VARCHAR(200) NOT NULL,
    body        TEXT         NOT NULL,
    -- What the row is about, so a tap can open it. Null for news with nowhere to go.
    reference_type VARCHAR(30),
    reference_id   VARCHAR(26),
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- The only query the app makes: this person's rows, newest first.
CREATE INDEX idx_user_notifications_user ON user_notifications (user_id, created_at DESC);
