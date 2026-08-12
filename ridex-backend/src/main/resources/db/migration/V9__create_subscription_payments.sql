CREATE TABLE subscription_payments (
                                       id VARCHAR(26) PRIMARY KEY,

                                       tenant_id VARCHAR(26) NOT NULL,
                                       subscription_id VARCHAR(26) NOT NULL,

                                       amount NUMERIC(12, 2) NOT NULL,
                                       currency_code VARCHAR(10) NOT NULL,

                                       status VARCHAR(50) NOT NULL,

                                       payment_provider VARCHAR(50),
                                       provider_payment_id VARCHAR(255),
                                       provider_transaction_id VARCHAR(255),

                                       payment_method VARCHAR(50),

                                       initiated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       completed_at TIMESTAMP,

                                       failure_code VARCHAR(100),
                                       failure_reason VARCHAR(500),

                                       refund_amount NUMERIC(12, 2),
                                       refunded_at TIMESTAMP,

                                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                       CONSTRAINT fk_subscription_payments_tenant
                                           FOREIGN KEY (tenant_id)
                                               REFERENCES tenants(id),

                                       CONSTRAINT fk_subscription_payments_subscription
                                           FOREIGN KEY (subscription_id)
                                               REFERENCES tenant_subscriptions(id),

                                       CONSTRAINT chk_subscription_payments_amount
                                           CHECK (amount >= 0),

                                       CONSTRAINT chk_subscription_payments_refund
                                           CHECK (refund_amount IS NULL OR refund_amount >= 0)
);

CREATE INDEX idx_subscription_payments_tenant_id
    ON subscription_payments(tenant_id);

CREATE INDEX idx_subscription_payments_subscription_id
    ON subscription_payments(subscription_id);

CREATE INDEX idx_subscription_payments_status
    ON subscription_payments(status);

CREATE INDEX idx_subscription_payments_provider_payment_id
    ON subscription_payments(provider_payment_id);