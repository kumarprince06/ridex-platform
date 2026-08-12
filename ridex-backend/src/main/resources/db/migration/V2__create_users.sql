CREATE TABLE users (
                       id VARCHAR(26) PRIMARY KEY,

                       email VARCHAR(255) NOT NULL,
                       phone VARCHAR(30),

                       password_hash VARCHAR(255) NOT NULL,

                       first_name VARCHAR(100) NOT NULL,
                       last_name VARCHAR(100),

                       status VARCHAR(50) NOT NULL,

                       email_verified_at TIMESTAMP,

                       last_login_at TIMESTAMP,

                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                       CONSTRAINT uk_users_email UNIQUE (email)
);