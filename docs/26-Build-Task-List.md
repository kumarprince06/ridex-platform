# RideX B2C — Build Task List

The execution order. [21-Gap-Tasks.md](21-Gap-Tasks.md) records what was already done and why;
this document is what to do next, step by step, with the business rules each step must enforce.

**Rules of engagement**

- Do not start a step before the one above it is verified. Each step names its own done-when.
- Every step lands with its test. A step without a test is not finished, it is unmeasured.
- A business rule stated here is the rule. If the code disagrees with it, one of the two is wrong —
  resolve it before moving on, in an ADR if it is a real decision.
- Comments in the code are one or two lines, above the thing, saying **why**. Never a paragraph.

Legend: `S` small (under a day) · `M` a few days · `L` a week or more.

---

## Step 0 — Stop the bleeding · `S`

Before any feature work. These are live problems, not improvements.

| # | Task | Why now |
|---|---|---|
| 0.1 | **Rotate the Google Maps key.** A working key is committed as a default in `application.yml` and is in git history (commit `771f6c0`). Rotate at Google, then remove the default | Restricting or deleting the line does not un-leak a published key. Someone else can bill your account today |
| 0.2 | Align `pom.xml` to Java 21 | Docs and README say 21, the build says 17 |
| 0.3 | Add CORS config for the console origin | The admin web physically cannot call the API right now |
| 0.4 | Add `spring-boot-starter-data-redis` | Documented everywhere, on the classpath nowhere |

**Done when:** old key rejected by Google, console can make an authenticated request, app boots with
a Redis connection.

---

## Step 1 — Finish Phase 0 · `M`

Closes the Phase-0 exit gate in [15-Phase-Plan.md](15-Phase-Plan.md).

### 1.1 Logout
`POST /auth/logout`, authenticated. Revokes the caller's own refresh row.

**Business logic:** revoking a session requires proving you own it — that is why this route is not
public. Revoke by matching the token hash *and* the authenticated user id, or one user can log
another out by guessing.

### 1.2 Email verification
`POST /auth/verify { token }`.

**Business logic:** hash the raw token, find it unconsumed and unexpired, stamp `consumed_at`, set
the user to `ACTIVE`. Redemption stamps rather than deletes, so a replay is distinguishable from a
token that never existed — and a replay returns the same answer as an unknown token, because a
different answer tells an attacker which tokens were real.

### 1.3 Forgot / reset password
`POST /auth/forgot-password`, `POST /auth/reset-password`.

**Business logic:** forgot-password **always** returns 202, whether or not the address exists. Any
other behaviour is an account-enumeration oracle. Reset consumes the token, sets the new hash, and
**revokes every refresh row for that user** — a password reset ends every session, or a reset after a
compromise leaves the attacker signed in.

### 1.4 Sessions
`GET /auth/sessions`, `DELETE /auth/sessions/{id}`, reading `refresh_tokens` as the device list.
A scheduled sweep deletes expired rows — they accumulate one per device login forever.

### 1.5 Security test
An unauthenticated call to a protected route returns 401; a wrong-role call returns 403.

**Done when:** register → verify → login → refresh → logout works end to end, and the security test
passes.

---

## Step 2 — Trustworthy tests · `S`

Replace H2 with Testcontainers Postgres. Move `GoogleMapsIntegrationTest` behind a tag so the
default build needs neither key nor network.

**Why here and not later:** the schema is Postgres-only. Every step after this one depends on tests
that actually run the migrations production runs. A dispatch race cannot be tested on H2 at all.

**Done when:** `./mvnw test` passes on a clean machine with only Docker running.

---

## Step 3 — Platform primitives · `M`

Built once, used by every step after. Building them later means retrofitting fifteen call sites.

### 3.1 `Money`
A value object: `long amountMinor` + `Currency`. Every monetary column is `BIGINT` minor units with
an explicit currency column.

**Business logic:** never a float, never an implicit currency. Rounding happens once, on a total,
never per line — per-line rounding accumulates error a rider can see on their receipt.

### 3.2 Idempotency filter
`idempotency_keys` table plus a filter on mutating POSTs. Same key and request hash returns the
stored response; same key, different body is a 422.

**Business logic:** mobile clients on bad networks retry. Without this, one dropped response is two
rides and two charges.

### 3.3 Outbox + worker
One `outbox` table, one worker claiming with `FOR UPDATE SKIP LOCKED`, exponential backoff, dead
letter after exhausted retries.

**Business logic:** the outbox row is written **inside the business transaction**. A completed trip
always has its notification queued; a rolled-back trip never notifies. Used later by notifications,
invoices, payouts and webhook follow-up — one mechanism, not four.

### 3.4 Domain exceptions
`DomainException` → `NotFoundException`, `ConflictException`, `ForbiddenException`,
`ValidationException`, mapped in `GlobalExceptionHandler`. Retire the global `IllegalArgument`/
`IllegalState` mappings.

### 3.5 Observability
Correlation ID filter, propagated into logs and outbound provider calls. Structured JSON logging.

### 3.6 Rate limiting
Bucket4j over Redis on auth, OTP, reset, estimate and `/maps/**`.

### 3.7 OpenAPI
`springdoc-openapi`. The generated document becomes the contract; the clients generate types from
it.

**Done when:** a retried POST returns the first response, an outbox row survives a restart, and
`/v3/api-docs` describes every existing endpoint.

---

## Step 4 — Profiles · `S`

`GET/PUT /rider/profile`, `GET/PUT /driver/profile`. Create the profile row **in the registration
transaction**.

**Business logic:** an account with no profile row is a null check in every screen that follows.
Names live on `users`, not per-profile — one person has one name across both roles, and two copies
are two places for it to disagree.

---

## Step 5 — Wire one flow end to end · `M`

**The step teams skip, and the one that pays for itself.**

Through all three clients: register → verify → login → profile. Build once, per client: API client
with base URL config, secure token storage, a refresh interceptor that retries the original request
once, and `ProblemDetail` → UI error mapping.

**Why here:** three finished UIs sitting on mock data for six months drift from the API in ways
nobody sees until integration week. Proving the pattern on the simplest flow makes every later flow
repetition instead of design.

**Done when:** a real account created on a phone appears in the console.

---

## Step 6 — Driver onboarding · `L`

Repositories and services for the entities that already exist.

**Business logic:**
- Transitions go through `DriverProfile.transitionTo` — no service invents a jump to `APPROVED`.
- Documents upload to object storage; `storage_key` is an object key, **never a public URL**. Access
  is a short-lived signed URL brokered by the API. KYC behind a guessable URL is how this leaks.
- Seat capacity is validated per vehicle type in application code. The SQL check is a flat 1..64
  because SQL cannot see the type; a hatchback is not a 7-seater.
- A daily sweep flags expired documents. An approved licence that lapsed yesterday makes a driver
  ineligible while `onboarding_status` still reads `APPROVED` — a status column cannot express time.

**Done when:** a driver can be taken from signup to approved through the partner app and the console,
and an expired document blocks them.

---

## Step 7 — Location · `M`

Driver position pings to Redis (`GEOADD`), never Postgres. Route cache in Redis keyed on rounded
coordinates. Service areas as polygons, with rides refused outside them.

**Business logic:** a ping every four seconds from every on-duty driver is a write rate Postgres
should not see, and its value expires in seconds. Losing Redis costs the last few seconds of
positions and nothing else.

Route caching is a cost control — map providers bill per call and identical routes are requested
constantly.

---

## Step 8 — Ride request and pricing · `L`

Tables: `ride_types`, `pricing_rules`, `ride_requests`, `fare_breakdowns`.

**Business logic:**
- **The fare is lines, not a number.** `BASE`, `DISTANCE`, `TIME`, `SURGE`, `DISCOUNT`, `TAX`,
  `TOLL`, each an append-only row. A single total cannot answer "why did my fare change", and cannot
  carry a discount without losing what it applied to.
- Surge comes from `pricing_rules`, never from a client field.
- An estimate is quoted with an expiry and stored. The final fare is recomputed server-side at
  completion from actual distance and time. The gap between quote and final is explained, not hidden.
- Cancellation fees are a policy table — who cancelled, in which state, how long after assignment.
  They change as often as marketing does, so they are data, not `if` statements.
- The rider's phone **displays** the fare; it never decides it.

---

## Step 9 — Dispatch · `L`

Table: `ride_offers`.

**Business logic:**
- The claim is one conditional statement:
  `UPDATE ride_offers SET status='ACCEPTED' WHERE id=? AND status='OFFERED' AND expires_at>now()`.
  Zero rows means lost — 409. The database is the arbiter; a read-then-write loses this race at
  every rush hour.
- The trip is created in the same transaction as the winning claim.
- Offers go out in waves — a small nearest batch, then widen. Broadcasting to everyone optimises for
  the platform and trains drivers to ignore offers.
- Expiry is server-issued. The countdown on the phone renders a server timestamp, or a paused app
  can accept a dead offer.
- Eligibility is composite: approved **and** documents valid now **and** an active vehicle **and** on
  duty.

**Done when:** two clients accepting one offer concurrently produce one trip and one 409, proven by a
test.

---

## Step 10 — Live trip · `L`

Tables: `trips` (with `@Version`), `trip_status_history`, `trip_locations`. WebSocket/STOMP with
Redis pub/sub fan-out.

**Business logic:**
- Every transition in one transaction: validate against the machine, write state, append history,
  enqueue outbox rows.
- `trip_status_history` is append-only and is what answers a dispute. A `status` column cannot say
  when, or by whom.
- Optimistic locking, because a rider cancelling as a driver starts must not both succeed.
- Completion emits an event. Payment, earnings, invoice and notification react to it — none run
  inside the completing transaction, or a gateway timeout strands a rider in a moving car.
- The actual path is simplified (Ramer–Douglas–Peucker) once at completion. Keeping every ping is
  storage spent on resolution nobody reads.

---

## Step 11 — Payments and the ledger · `L`

Tables: `payments`, `payment_events`, `refunds`, `ledger_accounts`, `ledger_entries`.

**Business logic:**
- Idempotency key on every outbound command. A retry without one is a second charge.
- Webhook: verify the signature **before parsing** — an unverified body is attacker input. Dedup on
  `provider_event_id` with a unique constraint, not an `if exists` check. Return 200 once recorded,
  or the provider retries forever.
- A reconciliation job polls provider state for stuck payments. A webhook that never arrives is
  otherwise a payment nobody notices.
- The ledger is append-only. Balance is derived. A refund appends; it never edits the payment.
- Everything goes through one `LedgerService.post()`. A second write path means the books stop
  balancing and nobody finds out for a month.

---

## Step 12 — Earnings and payouts · `M`

Tables: `driver_earnings`, `driver_payouts`, as ledger account types.

**Business logic:** commission and adjustments are explicit lines, never a net figure with no
derivation. A driver must be able to reconstruct their payout from trips — that is differentiator #1
and the most common driver complaint on every competing platform.

---

## Step 13 — Wallet · `M`

Ledger account types, not a new subsystem. Top-up, refund credit, promo credit, referral credit;
spend as wallet-first-then-card.

**Business logic:** no balance column anywhere. Balance is `SUM` over entries, or a cached row
updated in the same transaction under `@Version`. Every movement is an entry with an idempotency key.

---

## Step 14 — Promotions and coupons · `M`

Tables: `promotions`, `coupon_codes`, `promotion_redemptions`.

**Business logic:**
- Three tables because they are three things: the rule, the redeemable string, the fact of
  redemption. Collapsed, a shared code cannot have per-user limits.
- The evaluator returns a `DISCOUNT` **line** into `fare_breakdowns`; it never mutates a total.
- Reserved at request, committed at completion, released on cancel — without reservation, an
  abandoned booking silently burns the rider's coupon.
- Per-user cap is a unique index; global cap needs `SELECT ... FOR UPDATE`. Count-then-insert is a
  race, and promo abuse is automated within a week of launch.

---

## Step 15 — Notifications · `M`

Tables: `notification_outbox`, `notification_templates`, `notification_preferences`,
`device_tokens`. Email, push (FCM) and SMS behind one `NotificationChannel`.

**Business logic:** preferences are enforced in the dispatcher, with a hard-coded transactional set —
payment, safety, account security — that ignores them. A rider cannot unsubscribe from a receipt.
Device tokens are deleted on an FCM 404/410, or every send becomes mostly failures.

---

## Step 16 — Invoices · `M`

Table: `invoices`.

**Business logic:** **snapshot, never join.** Buyer name, address and every fare line are copied in
at issue. A driver renaming themselves must not rewrite last year's invoice — a joined invoice is a
query, not a record. Sequential number per year from a DB sequence, immutable once issued; a
correction is a credit note. PDF rendered at issue, stored, served by short-lived signed URL.

---

## Step 17 — Shuttle · `L`

Tables: `routes`, `route_stops`, `shuttle_schedules`, `shuttle_trips`, `shuttle_bookings`,
`route_fares`.

**Decide first, in an ADR:** separate tables or a trip supertype. **Do not add a `type` column to
`trips` and branch on it** — that quietly puts a conditional in every service in the codebase.

**Business logic:** this is seat inventory on a schedule, not dispatch. No offers, no driver search.
Overbooking is prevented by `CHECK (seats_booked <= seats_total)` plus `@Version` — the constraint
is what actually holds. Fares are a published stop-pair table, never surge. Reuses trips, payments,
ledger, promotions and notifications; reuses nothing from dispatch or dynamic pricing.

---

## Step 18 — Admin and audit · `L`

Table: `audit_logs`. Back the 33 console pages with real endpoints.

**Business logic:** audit is written by an interceptor around admin mutations, never by each endpoint
remembering to — the one that forgets is always the refund endpoint. `reason` is mandatory on
destructive actions and rejected server-side; the console already collects it, but a client is not a
control. Support raises cases, finance releases money — keep those permissions apart, because one
person doing both is the standard internal-fraud pattern in a marketplace.

---

## Step 19 — Differentiators · `L`

Pick two or three from [27-Unique-Feature-Set.md](27-Unique-Feature-Set.md) and validate before
building more. Most of them are presentation over data the earlier steps already produce, which is
exactly why they come after and not before.

---

## Step 20 — Production hardening · `L`

Load tests against dispatch and estimate. Security testing. Metrics and alerts on payment, dispatch
and notification failure. Backups with a **restore actually rehearsed** — an untested backup is a
belief, not a backup. DR runbook. Mobile release pipeline. PII deletion that anonymizes rather than
cascade-deleting financial and audit rows.

---

## Standing rules

| Rule | Reason |
|---|---|
| Migrations are never edited after being applied to a shared environment | Correct with a new one |
| Expand → migrate → contract | Never drop a column in the same release that stops writing it |
| Entities never cross the `api` boundary | A rename becomes a client release |
| `@Transactional` on the application service only | One use case, one transaction |
| A state machine lives in exactly one place | Every extra copy is a divergence waiting to happen |
| Never log passwords, raw tokens, payment secrets or KYC | [14-Security.md](14-Security.md) |
| Never trust a client-supplied ID without an ownership check | |
| Every concurrency guarantee is a database constraint | An application check is a race with extra steps |
