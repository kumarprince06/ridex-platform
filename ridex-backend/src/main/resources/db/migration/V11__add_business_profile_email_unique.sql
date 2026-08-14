-- V1 enforced uk_tenants_business_email. V10 dropped tenants.business_email when identity was
-- normalized into tenant_business_profiles, but V4 never carried the uniqueness across, so business
-- email silently became duplicable. Restore it here so lookups by business email are single-valued.
ALTER TABLE tenant_business_profiles
    ADD CONSTRAINT uk_business_profile_business_email UNIQUE (business_email);
