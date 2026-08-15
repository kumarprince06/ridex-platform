# Phase 2 — Step 1: Registration Foundation — Task List

Working checklist for `POST /api/v1/auth/register` and email verification.
One task at a time. Each task ends in something verifiable and one commit.

**Status:** Tasks 1-5 done. Next up is Task 6.

---

## Decisions already locked

| Decision | Outcome | Why |
|---|---|---|
| `used_at` vs `verified_at` | **Keep `verified_at`** | Already in the DB from V5. Zero migration. Password reset should get its own table rather than share this one. |
| UTC conversion timing | **Its own commit, first** | Free while tables are empty; isolated and bisectable. |
| Notification design | **Spring events, no channel interface yet** | Decouples `AuthService` from email without guessing the shape of push/SMS payloads. |
| Dev mail | **Mailpit** (not yopmail) | Catches mail locally; cannot reach a real person. yopmail needs real outbound SMTP — that's a staging concern. |
| V12 content | **UTC conversion, NOT a token table** | `email_verification_tokens` already exists from V5. A `CREATE TABLE` fails with `42P07`. |

---

## Ground rules for every task

- **Never edit V1–V11.** All applied, all `success = t`. Corrections go in a new migration.
- Package structure is fixed. No new packages without asking.
- `ddl-auto: validate` stays. Never `update`. Flyway stays enabled.
- No PostgreSQL enum types — `VARCHAR(50)` + `@Enumerated(EnumType.STRING)`.
- IDs are ULIDs via `com.ridex.util.UlidGenerator` in `@PrePersist`. Never UUID.
- One concern per commit. No `Co-Authored-By` trailers.
- Verification token: never logged, never returned by the API, stored only as a hash.
- Passwords only ever stored through the password encoder.
- Test registrations use `@yopmail.com` addresses, never `@example.com`, so the same address
  works unchanged once staging sends real mail.

---

## Task 1 — Convert all timestamps to UTC

**Do this first.** All 8 tables are empty, so it is pure DDL with no data risk. After registration writes rows it becomes a data migration where the original timezone of each value has to be proven. Server session timezone is currently `Asia/Kolkata`, so today's naive values are IST wall-clock with nothing recording that.

- [x] New `V12__convert_timestamps_to_utc.sql` — 31 columns across 8 tables
      `ALTER TABLE <t> ALTER COLUMN <c> TYPE timestamptz USING <c> AT TIME ZONE 'UTC';`
      The `USING` clause matters — without it Postgres reinterprets values in the session zone.
- [x] `LocalDateTime` → `Instant` in `Tenant`, `User`, `TenantUser`, `TenantBusinessProfile`
- [x] `LocalDateTime` → `Instant` in `dto/response/TenantResponse`
- [x] `LocalDateTime.now()` → `Instant.now()` in every `@PrePersist` / `@PreUpdate`
- [x] `application.yml`: `spring.jpa.properties.hibernate.jdbc.time_zone: UTC`

Column counts: `tenant_subscriptions` 8, `subscription_payments` 5, `tenants` 4, `users` 4,
`email_verification_tokens` 3, `tenant_users` 3, `subscription_plans` 2, `tenant_business_profiles` 2.

**Done when:** compiles, app starts, `Successfully validated 12 migrations`, no Hibernate schema errors.

**Commit:** `refactor(db): store all timestamps as UTC instants`

> Storage is an absolute instant with no zone. Display converts to the tenant's zone at the edge,
> using `tenant_business_profiles.timezone`. Those are two separate jobs.

---

## Task 2 — EmailVerificationToken entity + repository

Maps to the **existing V5 table**. No migration in this task.

- [x] `entity/EmailVerificationToken.java`
      - `id` ULID, `@ManyToOne(LAZY)` to `User` on `user_id`
      - `token_hash` (unique), `expires_at`, `verified_at` (nullable), `created_at`
      - Constraint names from V5: `fk_email_verification_user`, `uk_email_verification_token`
      - No `updated_at` column exists on this table — do not map one
- [x] `repository/EmailVerificationTokenRepository.java` — `findByTokenHash(String)`

**Done when:** Hibernate `validate` passes and startup logs 5 JPA repositories (currently 4).

**Commit:** `feat(auth): map email_verification_tokens entity and repository`

---

## Task 3 — Password encoder + security config

Without this, Task 4 returns 401 no matter how correct the service is. Spring Security is on the
classpath with zero configuration today.

- [x] `config/PasswordConfig.java` — `BCryptPasswordEncoder` bean
- [x] `config/SecurityConfig.java` — `SecurityFilterChain`
      - `permitAll` on `/api/v1/auth/**` and actuator health
      - everything else authenticated
      - CSRF disabled (stateless JSON API), stateless session policy

**Done when:** a request to `/api/v1/auth/**` reaches the app (404/405) instead of 401.

**Commit:** `feat(security): add password encoder and permit auth endpoints`

> `security/` stays empty for now — it's for JWT filters and `TenantContext` in a later phase.

---

## Task 4 — Registration endpoint (no email yet)

Deliberately no email. Confirm the database path works first, so a failure here can't be
confused with SMTP config.

- [x] `dto/request/RegisterRequest.java` — email + password, bean validation
- [x] `dto/response/RegisterResponse.java` — message only, **never the token**
- [x] `util/VerificationTokenGenerator.java` — `SecureRandom` 32 bytes → Base64URL; SHA-256 for the stored hash
- [x] `exception/EmailAlreadyExistsException.java`
- [x] `exception/GlobalExceptionHandler.java` — `@RestControllerAdvice`
- [x] `service/AuthService.java` — `@Transactional`
- [x] `controller/AuthController.java` — `POST /api/v1/auth/register` → 202

Write order is forced by the FKs: `User` → `Tenant` → `TenantUser` → token.

States: `User.status = PENDING`, `Tenant.lifecycleStatus = REGISTERED`,
`TenantUser` = `ADMIN` / `ACTIVE`. Tenant intentionally has no business profile yet.

`existsByEmail` then insert is a check-then-act race — also catch
`DataIntegrityViolationException` from `uk_users_email` and map both to the same error.

**Done when:** `curl` returns 202; one row each in `users`, `tenants`, `tenant_users`,
`email_verification_tokens`; `password_hash` is a bcrypt string; `token_hash` is 64 hex chars;
duplicate email returns 409, not 500.

**Commit:** `feat(auth): implement registration endpoint`

---

## Task 5 — Mail sandbox

- [x] ~~docker-compose Mailpit~~ — not needed, Mailpit v1.30.7 is installed natively at `/usr/local/bin/mailpit`
- [x] `pom.xml` — `spring-boot-starter-mail`
- [x] Mail config in `application.yml` — profile split deferred until a second environment exists

**Done when:** inbox loads at `http://localhost:8025` and the app starts on the dev profile.

**Commit:** `chore(mail): add mailpit sandbox and mail starter`

---

## Task 6 — Verification email via domain event

- [ ] `service/UserRegisteredEvent.java` — carries the raw token; no `toString()` exposing it
- [ ] `service/EmailVerificationListener.java` — `@TransactionalEventListener(AFTER_COMMIT)`
- [ ] `AuthService` publishes the event instead of sending mail itself

Keep the listener synchronous. `@Async` would make a failed send vanish silently.

**Done when:** registering shows an email in Mailpit with a working link, and a forced rollback
produces no email.

**Commit:** `feat(auth): send verification email after registration commits`

> Adding push or SMS later = a new listener class on the same event. Nothing existing changes.
> The channel interface waits until fan-out is driven by user preference.

---

## Task 7 — Verification endpoint

- [ ] `GET /api/v1/auth/verify?token=<raw>`
- [ ] Hash incoming token → `findByTokenHash` → reject if missing, expired, or already used
- [ ] Stamp `verified_at`; `User.status PENDING → ACTIVE` + `emailVerifiedAt`; `Tenant.emailVerifiedAt`

**Done when:** the link activates the user; a second click is rejected; an expired token is rejected.

**Commit:** `feat(auth): add email verification endpoint`

---

## Deferred — explicitly not in this phase

JWT / login · `TenantContext` + filter · business profile onboarding · subscription and payment
logic · notification outbox, push, SMS · entities for `subscription_plans`, `tenant_subscriptions`,
`subscription_payments` · real SMTP provider and yopmail staging tests

---

## Known gaps to revisit

- `.gitignore` is empty (0 bytes) — `target/` is untracked only by luck
- Local DB password sits in git history in `application.yml` as a comment
- `TenantUserStatus.INACTIVE` overlaps with `SUSPENDED` / `REMOVED` — prune while there is no data
- `UserRepository.existsByPhone` has undefined semantics: `users.phone` has no unique constraint
- `CreateTenantRequest` still models the pre-V10 shape; it belongs to onboarding, not registration
