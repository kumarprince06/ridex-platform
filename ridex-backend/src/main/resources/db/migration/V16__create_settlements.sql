CREATE TABLE settlements (
    id VARCHAR(26) PRIMARY KEY,

    tenant_id VARCHAR(26) NOT NULL,
    invoice_id VARCHAR(26) NOT NULL,
    payment_id VARCHAR(26) NOT NULL,

    amount NUMERIC(12, 2) NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,

    provider_name VARCHAR(100),
    provider_reference VARCHAR(255),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    CONSTRAINT uk_settlements_invoice UNIQUE (invoice_id),

    CONSTRAINT fk_settlements_tenant
        FOREIGN KEY (tenant_id)
            REFERENCES tenants(id),

    CONSTRAINT fk_settlements_invoice
        FOREIGN KEY (invoice_id)
            REFERENCES invoices(id),

    CONSTRAINT fk_settlements_payment
        FOREIGN KEY (payment_id)
            REFERENCES subscription_payments(id),

    CONSTRAINT chk_settlements_amount
        CHECK (amount >= 0)
);

CREATE INDEX idx_settlements_tenant_id
    ON settlements(tenant_id);

CREATE INDEX idx_settlements_invoice_id
    ON settlements(invoice_id);

CREATE INDEX idx_settlements_payment_id
    ON settlements(payment_id);

CREATE INDEX idx_settlements_status
    ON settlements(status);
