CREATE TABLE tenant_database_provisioning (
    id VARCHAR(26) PRIMARY KEY,

    tenant_id VARCHAR(26) NOT NULL,

    database_name VARCHAR(255),
    database_host VARCHAR(255),
    database_port INTEGER,
    database_username VARCHAR(255),

    status VARCHAR(50) NOT NULL,

    provisioning_started_at TIMESTAMP,
    provisioned_at TIMESTAMP,
    failed_at TIMESTAMP,

    failure_reason VARCHAR(1000),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tenant_database_provisioning_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_tenant_database_provisioning_tenant
        UNIQUE (tenant_id),

    CONSTRAINT chk_tenant_database_provisioning_port
        CHECK (
            database_port IS NULL
            OR database_port BETWEEN 1 AND 65535
        )
);

CREATE INDEX idx_tenant_database_provisioning_status
    ON tenant_database_provisioning(status);