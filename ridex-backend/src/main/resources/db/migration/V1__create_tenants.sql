CREATE TABLE tenants (
                         id VARCHAR(26) PRIMARY KEY,

                         business_name VARCHAR(255) NOT NULL,
                         business_email VARCHAR(255) NOT NULL,

                         status VARCHAR(50) NOT NULL,

                         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                         CONSTRAINT uk_tenants_business_email UNIQUE (business_email)
);