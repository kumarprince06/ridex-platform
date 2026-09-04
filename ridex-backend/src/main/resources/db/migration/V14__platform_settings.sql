-- Values operations must be able to change without a deploy.
--
-- Rates, rewards and commission move with the market, and a redeploy per change means the numbers
-- go stale instead. The YAML default stays as the fallback, so a missing row is never an outage -
-- it just means nobody has overridden it yet.
CREATE TABLE platform_settings (
    setting_key   VARCHAR(80)  PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,

    -- What the value means and what units it is in. Operations edits this in a form, not a shell.
    label         VARCHAR(120) NOT NULL,
    description   VARCHAR(500),
    value_type    VARCHAR(20)  NOT NULL,

    -- Bounds, so a typo cannot set the referral reward to a million points.
    min_value     NUMERIC(14, 4),
    max_value     NUMERIC(14, 4),

    updated_by    VARCHAR(26),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_platform_settings_updater FOREIGN KEY (updated_by) REFERENCES users (id)
);

INSERT INTO platform_settings
    (setting_key, setting_value, label, description, value_type, min_value, max_value)
VALUES
    ('points.referral-reward', '250', 'Referral reward',
     'Points the referrer gets once their friend finishes a first ride.', 'INTEGER', 0, 100000),
    ('points.referral-welcome', '100', 'Referral welcome bonus',
     'Points the new rider gets for joining with a code.', 'INTEGER', 0, 100000),
    ('points.per-ride', '20', 'Points per ride',
     'Points earned for each completed ride.', 'INTEGER', 0, 10000),
    ('points.per-currency-unit', '100', 'Points per rupee',
     'How many points buy one rupee off a fare. Higher means points are worth less.',
     'INTEGER', 1, 100000),
    ('payments.commission-rate', '0.20', 'Platform commission',
     'Share of the fare the platform keeps, as a fraction. 0.20 is 20%.', 'DECIMAL', 0, 0.5);
