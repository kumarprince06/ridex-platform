CREATE TABLE refresh_tokens (
                               id VARCHAR(26) PRIMARY KEY,

                               user_id VARCHAR(26) NOT NULL,
                               token_hash VARCHAR(255) NOT NULL,

                               expires_at TIMESTAMP NOT NULL,
                               revoked_at TIMESTAMP,

                               created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT fk_refresh_tokens_user
                                   FOREIGN KEY (user_id)
                                       REFERENCES users(id)
                                       ON DELETE CASCADE,

                               CONSTRAINT uk_refresh_tokens_token_hash
                                   UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);

CREATE INDEX idx_refresh_tokens_expires_at
    ON refresh_tokens(expires_at);

CREATE INDEX idx_refresh_tokens_revoked_at
    ON refresh_tokens(revoked_at);