# RideX B2C — Security Architecture

## Authentication
- Short-lived JWT access tokens
- Rotating refresh tokens
- Hash refresh tokens in DB
- Password hashing with BCrypt/Argon2
- Verification/reset tokens stored hashed
- Device/session tracking
- Logout/revocation

## Authorization
Use permission-based authorization:
- RIDER_SELF
- DRIVER_SELF
- DRIVER_TRIP
- SUPPORT_CASE
- OPERATIONS
- FINANCE
- SUPER_ADMIN

Never trust IDs from a client without checking ownership/permission.

## Sensitive data
Never log:
- passwords
- raw verification tokens
- refresh tokens
- payment secrets
- full payment credentials
- sensitive KYC documents

## External integrations
- Verify payment webhooks
- Validate map provider responses
- Use timeouts
- Retry only safe operations
- Store provider correlation IDs

## API security
- Rate limit auth
- Rate limit OTP/verification
- Validate request sizes
- Validate file uploads
- Use MIME/type/size controls
- Restrict CORS
- Security headers
- TLS everywhere outside local development

## Audit
Audit:
- admin changes
- refunds
- payout changes
- driver approval
- safety actions
- account status changes
