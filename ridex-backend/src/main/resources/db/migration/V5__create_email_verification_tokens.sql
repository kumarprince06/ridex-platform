CREATE TABLE email_verification_tokens (
                                           id VARCHAR(26) PRIMARY KEY,

                                           user_id VARCHAR(26) NOT NULL,

                                           token_hash VARCHAR(255) NOT NULL,

                                           expires_at TIMESTAMP NOT NULL,
                                           verified_at TIMESTAMP,

                                           created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                           CONSTRAINT fk_email_verification_user
                                               FOREIGN KEY (user_id)
                                                   REFERENCES users(id)
                                                   ON DELETE CASCADE,

                                           CONSTRAINT uk_email_verification_token
                                               UNIQUE (token_hash)
);

CREATE INDEX idx_email_verification_user_id
    ON email_verification_tokens(user_id);

CREATE INDEX idx_email_verification_expires_at
    ON email_verification_tokens(expires_at);