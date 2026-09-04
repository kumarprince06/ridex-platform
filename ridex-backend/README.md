# RideX Backend

Java 21 + Spring Boot API for the RideX platform. One deployable, modular layered, one PostgreSQL
database. It serves all three clients — [rider app](../ridex-rider-app/), [partner
app](../ridex-partner-app/), [console](../ridex-admin-web/) — from the same contract.

**Phase 0.** Registration, login and token refresh work end to end. Driver-onboarding and profile
schema exist with entities mapped to them, but nothing is wired to those entities yet. Rides,
dispatch, trips, payments, notifications and admin are not built. Current state and the ordered
task list: [docs/21-Gap-Tasks.md](../docs/21-Gap-Tasks.md).

---

## Running it

**Prerequisites:** JDK 21, Docker, and either Maven or the bundled `./mvnw`.

```bash
# from the repository root — Postgres, Redis and Mailpit
export RIDEX_APP_PASSWORD=ridex_local
docker compose up -d

cd ridex-backend
./mvnw spring-boot:run
```

| | |
|---|---|
| API | `http://localhost:8080` |
| Health | `http://localhost:8080/actuator/health` |
| Mail UI (Mailpit) | `http://localhost:8025` |

```bash
./mvnw test           # unit + integration
./mvnw verify         # test + package
./mvnw clean package  # jar in target/
```

### Configuration

Everything lives in [`src/main/resources/application.yml`](src/main/resources/application.yml) and
reads from the environment. Nothing secret belongs in that file.

| Variable | Required | Purpose |
|---|---|---|
| `RIDEX_APP_PASSWORD` | yes | Postgres password for the `ridex_app` role |
| `RIDEX_JWT_SECRET` | outside local dev | HMAC signing key. The in-file default exists so a fresh clone boots; it must never reach a deployed environment |
| `GOOGLE_MAPS_API_KEY` | for `/maps/**` | Geocoding and distance-matrix key |

A single Spring profile today, because there is a single environment. Split it when a second one
exists — a `prod` block nobody runs only rots.

---

## Package layout

```
com.ridex
├── api              controllers and request/response DTOs — HTTP shapes, no business rules
├── application      use cases: transaction boundaries, orchestration across aggregates
├── domain           entities, enums, state machines — the rules, framework-free
├── infrastructure   JPA repositories, security, maps, mail, storage, payment providers
└── shared           cross-cutting primitives only (ULIDs, hashing, error handling)
```

Dependencies point inward. `application` depends on domain abstractions; `infrastructure`
implements them. The domain must not import Spring MVC, a payment SDK, a mail SDK, or JPA details
where it can be avoided — the whole point is that a provider swap is an `infrastructure` change.

`shared` is not a junk drawer. If something there is used by exactly one module, it belongs in that
module.

Full detail and the target module list: [docs/08-Backend-Architecture.md](../docs/08-Backend-Architecture.md).
Class-level detail: [docs/25-LLD-Low-Level-Design.md](../docs/25-LLD-Low-Level-Design.md).

---

## Authentication

Three things make this different from a textbook JWT setup, and all three are deliberate.

**App-scoped tokens.** A login states which surface it came from — `RIDER`, `DRIVER` or `ADMIN`:

```json
POST /api/v1/auth/login
{ "email": "a@b.com", "password": "...", "app": "RIDER" }
```

`AppContext.grantableFrom()` intersects that surface's permitted roles with the roles the account
actually holds, and only the intersection is written into the token. A stolen rider-app token
therefore cannot reach driver endpoints even when the same person holds both roles. It also means a
driver signing into the rider app gets a clear message at the login screen rather than an
unexplained 403 four screens later.

This is least privilege and a usability control — not the security boundary. Endpoints still
authorize on role, so a forged `app` claim grants nothing by itself.

**One account, many roles.** A person who drives and also rides is one login with two rows in
`user_roles`, not two accounts. Only `RIDER` and `DRIVER` are self-registerable; staff roles are
provisioned by an existing admin, or a request body decides who is staff.

**Refresh rotation, with roles re-derived.** Each `POST /auth/refresh` replaces the stored hash in
place — the row is the device session, so it keeps its identity, `user_agent` and `ip_address` while
the secret it holds changes. Roles are read from the account on every refresh, so a role operations
removed stops applying within one access-token lifetime rather than surviving the full week.

Refresh tokens are stored hashed and never logged. `refresh_tokens` doubles as the session list —
one live row per device — which is why there is no separate `user_sessions` table.

### Endpoints today

```
POST /api/v1/auth/register     public
POST /api/v1/auth/login        public
POST /api/v1/auth/refresh      public
GET  /api/v1/maps/geocode      authenticated
GET  /api/v1/maps/route        authenticated
GET  /actuator/health          public
```

`SecurityConfig` also opens `/auth/verify`, `/auth/forgot-password` and `/auth/reset-password`.
Their schema is in place; the controllers are not written, so those paths 404 today (T4).

The target contract is [docs/10-API-Contract.md](../docs/10-API-Contract.md). It is hand-written and
will drift — replace it with a generated OpenAPI document as soon as there is more than auth to
describe.

---

## Database

PostgreSQL, shared schema, no tenant partitioning and none to be reintroduced (ADR-001). Flyway owns
the schema; migrations live in [`src/main/resources/db/migration`](src/main/resources/db/migration)
and Hibernate runs `ddl-auto: validate` — the entities are checked against the migrations at boot
and never allowed to alter them.

Conventions, applied from `V1` onward:

- ULID primary keys, `VARCHAR(26)` — sortable by creation time, safe to expose, no sequence contention
- `TIMESTAMPTZ` for every instant, stored UTC, converted at the edge
- Explicit foreign keys and indexes; every state column that gets filtered gets an index
- Financial history is append-only — no destructive updates, ever

**A migration applied to a shared environment is never edited.** Correct it with a new one.

```
V1__baseline.sql    users, user_roles, refresh_tokens, user_tokens
V2__profiles.sql    names on users; rider_profiles, driver_profiles,
                    driver_documents, driver_vehicles
```

Two shapes worth knowing. `user_tokens` carries a `purpose` column instead of separate
`email_verification_tokens` and `password_reset_tokens` tables — they differ only in intent, both
being single-use, hashed, expiring and user-scoped. And redemption stamps `consumed_at` rather than
deleting the row, so a replayed token is distinguishable from one that never existed.

Target model: [docs/09-Project-ERD.md](../docs/09-Project-ERD.md). Three places where the
implemented schema deliberately departs from it are listed under T7 in
[docs/21-Gap-Tasks.md](../docs/21-Gap-Tasks.md).

---

## Errors

`GlobalExceptionHandler` returns RFC 7807 `ProblemDetail` — Spring already models it, so there is no
hand-rolled error DTO. Validation failures add a `problem.errors` map of field to message.

| Exception | Status |
|---|---|
| `EmailAlreadyExistsException`, `DataIntegrityViolationException`, `IllegalStateException` | 409 |
| `BadCredentialsException` | 401 |
| `AccessDeniedException` | 403 |
| `EntityNotFoundException` | 404 |
| `MethodArgumentNotValidException`, `IllegalArgumentException` | 400 |

`DataIntegrityViolationException` maps to 409 because the pre-flight `existsByEmail` check is a
check-then-act race — two concurrent registrations can both see an address as free, and
`uk_users_email` is what actually enforces it. The constraint violation has to land on the same
answer as the friendly path.

Mapping the two `Illegal*` exceptions globally is a Phase-0 convenience. It stops being right the
moment the domain has real failure modes; replace them with a small domain exception hierarchy
before the trip and payment modules land.

---

## Testing

Every task lands with its test. Unit tests for domain and application logic, integration tests for
anything touching the schema, and security tests asserting that a protected route rejects an
unauthenticated call.

Four test files against ~45 sources is not adequate coverage and is tracked as debt in
`docs/21-Gap-Tasks.md`. Two things to fix before the count goes up:

- **H2 is on the test classpath against a Postgres-only schema.** Replace it with Testcontainers, or
  the tests are not exercising the migrations that production runs (T5).
- **`GoogleMapsIntegrationTest` boots the whole application to assert two bound properties**, and
  boots it against H2 to do so. It belongs in a plain `@ConfigurationProperties` slice test.

---

## Conventions

- Constructor injection via Lombok `@RequiredArgsConstructor`, fields `private final`. No field
  injection, no setter injection.
- `@Transactional` on the application service, never on a controller or a repository. One use case,
  one transaction.
- Controllers hold no business rules — they bind, validate, delegate and map the result.
- A state transition is validated in exactly one place. `DriverProfile.transitionTo` is the pattern:
  the machine from [docs/11](../docs/11-State-Machines.md) lives on the entity, so no caller can
  invent a transition.
- Never log a password, a raw token, a payment secret or KYC content
  ([docs/14](../docs/14-Security.md)).
- Never trust a client-supplied ID without an ownership check.

---

## Known gaps

Ordered by how much later work they block.

1. **Redis is documented but not on the classpath.** Driver location, rate limiting and caching all
   need it (T8).
2. **No CORS configuration** — the console cannot call this API at all yet.
3. **No rate limiting.** `/maps/**` is an authenticated but unmetered proxy to a billed Google API.
4. **No OpenAPI document**, so all three clients hand-write their types and will drift (T16).
5. **No correlation ID or structured logging**, both required by
   [docs/06](../docs/06-Non-Functional-Requirements.md).
6. **No idempotency handling.** Mobile clients on bad networks retry POSTs; without it, payments and
   ride requests will duplicate.
7. **`pom.xml` targets Java 17 while the docs specify 21.** Pick one.
8. **Registration does not create a profile row** — signup writes `user_roles` and nothing else (T6).
