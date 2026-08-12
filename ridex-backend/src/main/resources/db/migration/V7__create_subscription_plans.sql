CREATE TABLE subscription_plans (
                                    id VARCHAR(26) PRIMARY KEY,

                                    code VARCHAR(50) NOT NULL,
                                    name VARCHAR(100) NOT NULL,
                                    description VARCHAR(500),

                                    billing_interval VARCHAR(30) NOT NULL,

                                    price_amount NUMERIC(12, 2) NOT NULL,
                                    currency_code VARCHAR(10) NOT NULL,

                                    trial_days INTEGER NOT NULL DEFAULT 0,

                                    is_active BOOLEAN NOT NULL DEFAULT TRUE,

                                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                    CONSTRAINT uk_subscription_plans_code UNIQUE (code),

                                    CONSTRAINT chk_subscription_plans_price
                                        CHECK (price_amount >= 0),

                                    CONSTRAINT chk_subscription_plans_trial_days
                                        CHECK (trial_days >= 0)
);

CREATE INDEX idx_subscription_plans_active
    ON subscription_plans(is_active);