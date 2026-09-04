-- Every mutating action operations takes, and why.
--
-- Written by an interceptor rather than by each endpoint remembering to: the one that forgets is
-- always the refund. Append-only, and never deleted with the account it describes.
CREATE TABLE audit_logs (
    id            VARCHAR(26)  PRIMARY KEY,

    actor_user_id VARCHAR(26),
    actor_email   VARCHAR(255),

    action        VARCHAR(80)  NOT NULL,
    target_type   VARCHAR(40),
    target_id     VARCHAR(26),

    -- Snapshots, not references: what a record looked like before and after must not change when
    -- the record does.
    before_state  TEXT,
    after_state   TEXT,

    -- Mandatory for destructive actions, enforced in the API rather than trusted from the console.
    reason        VARCHAR(500),

    ip_address    VARCHAR(45),
    user_agent    VARCHAR(255),

    occurred_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- SET NULL, not CASCADE: deleting a staff account must not erase what they did.
    CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_time ON audit_logs (occurred_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs (target_type, target_id, occurred_at DESC);
