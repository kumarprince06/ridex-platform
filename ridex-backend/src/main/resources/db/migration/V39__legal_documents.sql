-- Terms and privacy text, edited by operations in the console and read by both apps.
--
-- Stored here rather than linked: RideX has no public website to host the pages, and the apps can
-- render text without a browser module. One row per document; the body is plain text with
-- '#'-prefixed headings.
CREATE TABLE legal_documents (
    slug        VARCHAR(40)  PRIMARY KEY,
    title       VARCHAR(120) NOT NULL,
    body        TEXT         NOT NULL,
    updated_by  VARCHAR(26),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_legal_documents_updater FOREIGN KEY (updated_by) REFERENCES users (id)
);

INSERT INTO legal_documents (slug, title, body) VALUES
    ('partner-terms', 'Partner Terms',
     E'# Partner Terms\n\nThese terms are a placeholder. Operations replaces them from the admin console before launch.'),
    ('rider-terms', 'Terms of Service',
     E'# Terms of Service\n\nThese terms are a placeholder. Operations replaces them from the admin console before launch.'),
    ('privacy-policy', 'Privacy Policy',
     E'# Privacy Policy\n\nThis policy is a placeholder. Operations replaces it from the admin console before launch.');
