CREATE TABLE tenant_business_profiles (
                                          id VARCHAR(26) PRIMARY KEY,

                                          tenant_id VARCHAR(26) NOT NULL,

                                          legal_business_name VARCHAR(255) NOT NULL,
                                          display_name VARCHAR(255) NOT NULL,

                                          business_email VARCHAR(255) NOT NULL,
                                          business_phone VARCHAR(30),

                                          country_code VARCHAR(10) NOT NULL,
                                          currency_code VARCHAR(10) NOT NULL,
                                          timezone VARCHAR(100) NOT NULL,

                                          registration_number VARCHAR(100),
                                          tax_identification_number VARCHAR(100),

                                          website VARCHAR(500),

                                          address_line_1 VARCHAR(255),
                                          address_line_2 VARCHAR(255),
                                          city VARCHAR(100),
                                          state VARCHAR(100),
                                          postal_code VARCHAR(30),

                                          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                          CONSTRAINT fk_business_profile_tenant
                                              FOREIGN KEY (tenant_id)
                                                  REFERENCES tenants(id)
                                                  ON DELETE CASCADE,

                                          CONSTRAINT uk_business_profile_tenant
                                              UNIQUE (tenant_id)
);