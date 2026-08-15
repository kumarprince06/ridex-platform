CREATE TABLE invoices (
    id VARCHAR(26) PRIMARY KEY,

    invoice_number VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(26) NOT NULL,
    subscription_id VARCHAR(26),
    payment_id VARCHAR(26),

    issue_date TIMESTAMP NOT NULL,
    due_date TIMESTAMP,

    total_amount NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    currency_code VARCHAR(10) NOT NULL,

    status VARCHAR(50) NOT NULL,
    pdf_url VARCHAR(500),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_invoices_invoice_number UNIQUE (invoice_number),

    CONSTRAINT fk_invoices_tenant
        FOREIGN KEY (tenant_id)
            REFERENCES tenants(id),

    CONSTRAINT fk_invoices_subscription
        FOREIGN KEY (subscription_id)
            REFERENCES tenant_subscriptions(id),

    CONSTRAINT fk_invoices_payment
        FOREIGN KEY (payment_id)
            REFERENCES subscription_payments(id),

    CONSTRAINT chk_invoices_total_amount
        CHECK (total_amount >= 0),

    CONSTRAINT chk_invoices_tax_amount
        CHECK (tax_amount >= 0),

    CONSTRAINT chk_invoices_discount_amount
        CHECK (discount_amount >= 0)
);

CREATE INDEX idx_invoices_tenant_id
    ON invoices(tenant_id);

CREATE INDEX idx_invoices_subscription_id
    ON invoices(subscription_id);

CREATE INDEX idx_invoices_payment_id
    ON invoices(payment_id);

CREATE INDEX idx_invoices_status
    ON invoices(status);
