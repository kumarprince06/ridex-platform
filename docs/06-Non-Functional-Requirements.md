# RideX B2C — Non-Functional Requirements

## Security
- OWASP-aligned API security
- BCrypt/Argon2 password hashing
- Hashed refresh tokens
- Hashed verification/reset tokens
- JWT signing key management
- Secret management outside source control
- Webhook signature verification
- Rate limiting on auth and sensitive endpoints

## Reliability
- Idempotent payment webhooks
- Idempotent critical commands
- Transaction boundaries around state changes
- Retry with backoff for external providers
- Dead-letter/recovery strategy for failed asynchronous work

## Performance targets
Initial engineering targets:
- p95 normal API latency < 300 ms excluding external provider latency
- Dispatch decision target < 2 seconds under normal load
- Real-time location updates should be rate-limited and efficiently delivered
- Database indexes must support active-driver and active-trip queries

## Scalability
- Stateless API nodes
- Redis for transient state/caching
- Queue-based asynchronous processing
- WebSocket/SSE or equivalent for real-time events
- Horizontal scaling

## Observability
- Correlation/request ID
- Structured JSON logs
- Metrics
- Distributed tracing
- Audit events
- Alerting for payment, dispatch and notification failures

## Data
- PostgreSQL as source of truth
- UTC timestamps
- ULIDs/UUIDs consistently
- Explicit foreign keys and indexes
- Soft deletion only where business semantics require it
