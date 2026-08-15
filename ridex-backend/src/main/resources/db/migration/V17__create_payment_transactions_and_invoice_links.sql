CREATE TABLE payment_transactions (
    id VARCHAR(26) PRIMARY KEY,

    tenant_id VARCHAR(26) NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,

    amount NUMERIC(12, 2) NOT NULL,
    currency_code VARCHAR(10) NOT NULL,

    payment_provider VARCHAR(50),
    provider_payment_id VARCHAR(255),
    provider_transaction_id VARCHAR(255),
    payment_method VARCHAR(50),

    failure_code VARCHAR(100),
    failure_reason VARCHAR(500),

    initiated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_transactions_tenant
        FOREIGN KEY (tenant_id)
            REFERENCES tenants(id),

    CONSTRAINT chk_payment_transactions_amount
        CHECK (amount >= 0)
);

CREATE INDEX idx_payment_transactions_tenant_id
    ON payment_transactions(tenant_id);

CREATE INDEX idx_payment_transactions_reference_id
    ON payment_transactions(reference_id);

CREATE INDEX idx_payment_transactions_status
    ON payment_transactions(status);

CREATE INDEX idx_payment_transactions_provider_payment_id
    ON payment_transactions(provider_payment_id);

ALTER TABLE invoices
    ADD COLUMN payment_transaction_id VARCHAR(26);

ALTER TABLE invoices
    ADD CONSTRAINT fk_invoices_payment_transaction
    FOREIGN KEY (payment_transaction_id)
        REFERENCES payment_transactions(id);

CREATE INDEX idx_invoices_payment_transaction_id
    ON invoices(payment_transaction_id);
