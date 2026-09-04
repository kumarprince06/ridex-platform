# RideX — Gap Closure Task List

Derived from `docs/` (B2C target) vs the B2B multi-tenant codebase it replaced.
Ordered. Do not start a task before the one above it is verified.

Work through T7 happens on branch `feat/b2c-pivot`.

---

## T0 — Decide and delete — **DONE**

- [x] B2C confirmed. Reason recorded in ADR-001: a public rider/driver signup has no tenant
      context at registration, so the tenant boundary and the identity boundary conflicted
- [x] Deleted `rideX-roadmap-phase-plan.md` (B2B roadmap, superseded by `docs/15-Phase-Plan.md`)
- [x] Rewrote `README.md` — it sold multi-tenant SaaS + Kafka, both of which `docs/19` forbids
- [x] Recorded the pivot in `docs/20-ADRs.md`

## T1 — Fresh database baseline — **DONE**

- [x] Database dropped and rebuilt
- [x] Deleted `db/migration/V1..V17`, replaced with one `V1__baseline.sql`
- [x] `users` (email UK, **phone UK** — was missing), `user_roles`, `refresh_tokens`, `user_tokens`
- [x] `TIMESTAMPTZ` throughout (V12 existed only to retrofit this)
- [x] Verified: migration applies clean, app boots, `ddl-auto: validate` passes

Two simplifications against the original plan:

- **`user_tokens` replaces `email_verification_tokens` + `password_reset_tokens`.** They differ
  only in intent — both single-use, hashed, expiring, user-scoped — so one table with a `purpose`
  column replaces two identical ones.
- **No `user_sessions` table.** A live refresh token *is* a session, so `refresh_tokens` carries
  `user_agent` / `ip_address` / `last_used_at` and covers FR-AUTH-007 without a second table.
- **No `audit_logs` yet.** Nothing writes to it until T15, and its shape will be wrong by then.

## T2 — Delete the tenant layer — **DONE**

- [x] Deleted `domain/tenant/`, `domain/business/`, `domain/subscription/`, `application/tenant/`,
      `application/subscription/`, their controllers, DTOs, repositories, `TenantContextHolder`
- [x] Deleted `infrastructure/payment/` — the gateway was subscription-shaped; T12 rebuilds it
- [x] Deleted the three tenant/billing tests
- [x] Kept `JwtService`, `JwtAuthenticationFilter`, `UlidGenerator`, `VerificationTokenGenerator`,
      `GlobalExceptionHandler`, `PasswordConfig`

## T3 — Fix the auth security hole — **DONE**

- [x] Removed `.requestMatchers("/api/v1/tenants/**").permitAll()` — it left every payment and
      settlement endpoint publicly callable
- [x] Default-deny; only the six public auth routes and `/actuator/health` are open
- [x] `@EnableMethodSecurity` added so a later `@PreAuthorize` is enforced, not silently ignored
- [ ] Still to do: a test asserting an unauthenticated call to a protected route returns 401

### Bugs found and fixed while rewriting auth

- `refresh_tokens.token_hash` was mapped `updatable = false` while `refresh()` rotated it in
  place, so Hibernate silently discarded every rotation and the original refresh token stayed
  valid for its full week.
- The JWT filter never checked `tokenType`, so a week-long refresh token was accepted as an
  access token on any endpoint.
- `login()` rejected only `PENDING`, so `SUSPENDED` and `DELETED` accounts could sign in normally.
- `login()` ran `deleteByUserId` on every login, so signing in on a phone silently signed the
  same person out everywhere else.
- `BadCredentialsException` had no handler, so every wrong password returned 500 rather than 401.

## T4 — Complete auth (docs/05 FR-AUTH-001..007) — **DONE**

- [x] Multi-role accounts — one person can hold RIDER and DRIVER on one login
- [x] App-scoped login: the client states its surface (`RIDER` / `DRIVER` / `ADMIN`) and the token
      is granted only that surface's roles, so a stolen rider-app token cannot reach driver routes
- [x] Staff roles rejected at public signup
- [x] Refresh token **rotation** on use, with roles re-derived from the account each time
- [x] `POST /auth/logout` — revokes the caller's own session, matched on their user id
- [x] `POST /auth/verify` — 6-digit code, attempt-capped
- [x] `POST /auth/forgot-password` + `POST /auth/reset-password` — reset revokes every session
- [x] Session/device listing + revoke, reading `refresh_tokens`
- [x] Expired refresh token cleanup — nightly sweep with a 7-day grace
- [x] Codes are delivered — outbox plus an email channel (T14 pulled forward, see below)
- [x] Security test: unauthenticated → 401, wrong role → 403

**Phase 0 exit gate: met.** App starts, migrations pass, register → verify → login → refresh →
logout works end to end, security tests pass.

### Hardening done alongside it

Not in the original plan; added because the endpoints were not safe to ship without it.

- [x] **Refresh token reuse detection.** One generation of history on the row; a replayed spent
      token revokes every session for the account and writes an audit event
- [x] **`auth_events`** — append-only record of login success, failure, block, logout, refresh,
      reset and theft. Failed logins against unknown addresses are recorded with a null user id,
      because those rows are what credential stuffing looks like
- [x] **Account enumeration closed.** Registration answers 202 either way and tells the owner by
      email; login compares against a decoy hash so an unknown address costs the same as a known one
- [x] **Rate limiting**, per IP (filter, ahead of authentication) and per account (failures only)
- [x] **JWT secret fail-fast** — no default, minimum 32 bytes, the old placeholder rejected
- [x] Access tokens cut to 15 minutes; BCrypt cost 12; security headers; 401 entry point

### Deferred, deliberately

- TOTP MFA for the admin surface — there is no admin surface yet (T15)
- Breach-password check — an external call on the signup path (T16)
- Argon2id — BCrypt at cost 12 is adequate and Argon2 needs BouncyCastle
- Access-token revocation before expiry — the 15-minute TTL covers the same risk
- `clientIp()` trusts the first `X-Forwarded-For` hop in `AuthController` and `RateLimitFilter`.
  Marked `ponytail:` in both. **Needs a trusted-proxy config before the rate limiter can be relied
  on in production** — a client can currently set that header and get a fresh bucket per request

## T5 — Local dev + CI — **MOSTLY DONE**

- [x] `docker-compose.yml` filled — was 0 bytes. Postgres + Redis + Mailpit
- [x] `.gitignore` filled — was 0 bytes
- [x] Real CI workflow at `.github/workflows/ci.yml` with a Postgres service, so a migration that
      does not apply cleanly fails the build. `.github/` previously held only IDE extension junk
- [x] `.editorconfig`, `.env.example`; untracked `.idea/`; deleted Spring Initializr `HELP.md`
- [ ] Testcontainers, so `mvn test` does not need a hand-run local Postgres

## T6 — Profiles (Phase 1) — **SCHEMA DONE**

- [x] `V2__profiles.sql`: `rider_profiles`, `driver_profiles`
- [x] `RiderProfile`, `DriverProfile` entities
- [ ] Rider profile GET/PUT
- [ ] Driver profile GET/PUT
- [ ] Create the matching profile row at registration — signup writes `user_roles` but no profile

## T7 — Driver onboarding (Phase 2) — **SCHEMA DONE**

- [x] `driver_documents`, `driver_vehicles` (folded into `V2__profiles.sql`)
- [x] `DriverOnboardingStatus` machine from docs/11, enforced in one place via
      `DriverProfile.transitionTo`
- [x] `DriverDocumentType` / `DriverDocumentStatus` / `VehicleType` / `VehicleStatus`
- [ ] Repositories and services — none written yet, the entities are not wired to anything
- [ ] S3-compatible document upload; `storage_key` is an object key, never a public URL
- [ ] Approval workflow endpoints
- [ ] Per-type seat validation — a hatchback is not a 7-seater. The SQL CHECK is a flat 1..64
      because it cannot see the vehicle type; the real bound belongs in application code
- [ ] Expiry sweep — an approved licence that lapsed is invalid, which `status` alone cannot say
      (`DriverDocument.isValidAt` exists; nothing calls it on a schedule yet)

### ERD deviations to fold back into docs/09

Three places where the implemented schema deliberately differs. Update the ERD or overrule these.

1. **Names on `users`, not `rider_profiles`.** The ERD gives `first_name`/`last_name` to
   RIDER_PROFILES and nothing to DRIVER_PROFILES, leaving a driver with no name. One person has
   one name across both roles.
2. **One `onboarding_status`, not `approval_status` + `onboarding_status`.** docs/11 defines a
   single machine whose terminal states are APPROVED / REJECTED / SUSPENDED — that machine *is*
   the approval status. Two columns for one machine can contradict each other.
3. **`RIDERS` on ERD line 11 is a stray entity** alongside `RIDER_PROFILES`. Pick one.

## T8 — Maps + location (Phase 3)

- [ ] `MapsProvider` interface (geocode, route, distance/duration) — provider-neutral
- [ ] One implementation (Google or Mapbox)
- [ ] Driver location writes to Redis, not Postgres

## T9 — Ride request + pricing (Phase 4)

- [ ] `V4__rides.sql`: `ride_requests`, `fare_breakdowns`, `ride_types`, `pricing_rules`
- [ ] Fare estimation
- [ ] Ride request state machine per `docs/11`, transitions validated in **one** boundary
- [ ] Cancellation rules

## T10 — Dispatch (Phase 5)

- [ ] `V5__dispatch.sql`: `ride_offers`
- [ ] Eligible driver search, offer creation, accept/reject, timeout, reassignment
- [ ] Concurrency protection — two drivers must not accept the same offer

## T11 — Live trip (Phase 6)

- [ ] `V6__trips.sql`: `trips`, `trip_locations`, `trip_status_history`
- [ ] WebSocket/STOMP for status + driver location
- [ ] arrive / start / complete + trip history

## T12 — Rebuild payments correctly (Phase 7)

The current gateway is subscription-shaped and has no idempotency.

- [ ] `V7__payments.sql`: `payments` (trip-scoped), `refunds`, `payment_events` (ledger)
- [ ] Rewrite `PaymentGateway` to the `docs/13` shape:
      `createPaymentIntent · confirmPayment · refundPayment · verifyWebhook · parseWebhook · getPayment`
- [ ] Idempotency key on every externally initiated command
- [ ] Webhook dedup by provider event ID
- [ ] Immutable ledger rows, never a mutable balance field

## T13 — Earnings + payout (Phase 8)

- [ ] `V8__earnings.sql`: `driver_earnings`, `driver_payouts`
- [ ] Commission, adjustments, settlement, payout, reconciliation

## T14 — Notifications (Phase 9) — **PARTLY DONE, pulled forward**

The outbox and two channels were built early because auth codes have to reach a real person, and
building delivery twice would have been worse than building it once in the right shape.

- [x] `notification_outbox` (in `V4`), claimed with `FOR UPDATE SKIP LOCKED`, exponential backoff,
      dead-lettering after six attempts
- [x] `NotificationChannel` with `EmailChannel` (working) and `SmsChannel` (**logs only** — a real
      provider needs an account, per-message billing and, for India, DLT template registration)
- [x] Templates in one class
- [ ] A real SMS provider
- [ ] Push (FCM) and `device_tokens`
- [ ] `notification_preferences`, with a transactional set that ignores them
- [ ] Templates in the database, once operations needs to edit them without a deploy

## T15 — Admin/ops (Phase 10)

- [ ] Dashboard, live trip map, driver/rider management, payments, refunds, support, audit

## T16 — Production hardening (Phase 12)

- [ ] OpenAPI/Swagger (absent today)
- [ ] Load tests, security testing, observability, backups, DR

---

## Cross-cutting debt to fix on the way

- Test coverage: 4 test files for ~65 sources. Every task above lands with its test.
- `docs/09-Project-ERD.md` line 11 has a stray `RIDERS` entity alongside `RIDER_PROFILES` — pick one.
- `docs/10-API-Contract.md` is B2C; the implemented controllers are all `/api/v1/tenants/**`. T2 resolves this.
