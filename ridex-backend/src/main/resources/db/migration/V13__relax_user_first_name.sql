-- Registration collects only email and password; the admin's name is gathered later during
-- onboarding, alongside the business profile. V2 declared first_name NOT NULL, which would force
-- registration to invent a value - deriving one from the email local part would store a guess as
-- if it were fact. Relaxing the column keeps "not collected yet" honestly represented as NULL.
ALTER TABLE users
    ALTER COLUMN first_name DROP NOT NULL;
