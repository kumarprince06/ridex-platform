CREATE TABLE tenant_users (
                              id VARCHAR(26) PRIMARY KEY,

                              tenant_id VARCHAR(26) NOT NULL,
                              user_id VARCHAR(26) NOT NULL,

                              role VARCHAR(50) NOT NULL,
                              status VARCHAR(50) NOT NULL,

                              joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                              CONSTRAINT fk_tenant_users_tenant
                                  FOREIGN KEY (tenant_id)
                                      REFERENCES tenants(id)
                                      ON DELETE CASCADE,

                              CONSTRAINT fk_tenant_users_user
                                  FOREIGN KEY (user_id)
                                      REFERENCES users(id)
                                      ON DELETE CASCADE,

                              CONSTRAINT uk_tenant_users_tenant_user
                                  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_tenant_id
    ON tenant_users(tenant_id);

CREATE INDEX idx_tenant_users_user_id
    ON tenant_users(user_id);