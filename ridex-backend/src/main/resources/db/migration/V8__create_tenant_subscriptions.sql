CREATE TABLE tenant_subscriptions (
                                      id VARCHAR(26) PRIMARY KEY,

                                      tenant_id VARCHAR(26) NOT NULL,
                                      subscription_plan_id VARCHAR(26) NOT NULL,

                                      status VARCHAR(50) NOT NULL,

                                      started_at TIMESTAMP,
                                      current_period_start TIMESTAMP,
                                      current_period_end TIMESTAMP,

                                      trial_start_at TIMESTAMP,
                                      trial_end_at TIMESTAMP,

                                      cancelled_at TIMESTAMP,
                                      cancellation_reason VARCHAR(500),

                                      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                      CONSTRAINT fk_tenant_subscriptions_tenant
                                          FOREIGN KEY (tenant_id)
                                              REFERENCES tenants(id),

                                      CONSTRAINT fk_tenant_subscriptions_plan
                                          FOREIGN KEY (subscription_plan_id)
                                              REFERENCES subscription_plans(id)
);

CREATE INDEX idx_tenant_subscriptions_tenant_id
    ON tenant_subscriptions(tenant_id);

CREATE INDEX idx_tenant_subscriptions_plan_id
    ON tenant_subscriptions(subscription_plan_id);

CREATE INDEX idx_tenant_subscriptions_status
    ON tenant_subscriptions(status);