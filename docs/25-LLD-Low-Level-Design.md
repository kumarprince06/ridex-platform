# RideX B2C — Low-Level Design

Class, table and algorithm level. The system-level view is
[24-HLD-High-Level-Design.md](24-HLD-High-Level-Design.md); the ordered build steps are
[26-Build-Task-List.md](26-Build-Task-List.md).

Marked **built** where the code exists today. Everything else is the shape to build to.

---

## 1. Package contract

Package by feature. One folder per module, layers inside it.

| Package | Holds | Never holds |
|---|---|---|
| `<feature>/` | Controller, service, repository for that feature | Another feature's internals |
| `<feature>/dto/` | Request and response records (immutable, validated) | Entities |
| `<feature>/domain/` | Entities, enums, state machines, invariants | Spring, HTTP types, provider SDKs |
| `platform/` | Security, JWT, error handling, correlation IDs | Business decisions |
| `shared/` | Primitives used by more than one feature | Anything with a single caller |

Three rules, all enforced by `PackageStructureTest` (ArchUnit) so a violation fails the build:

1. **Nothing in `**/domain/**` imports Spring.** JPA annotations are the accepted exception — the
   entities *are* the domain model, and a second set of mapping classes would be two models to
   keep in step. Everything else stays out, so fare maths and state machines test in milliseconds.
2. **`domain/` never imports `dto/` or `platform/`.** Dependencies point inward.
3. **A feature never reaches another feature's `domain/`.** Cross-feature access goes through that
   feature's service, which is what keeps the modules separable later.

**Entities never cross into a DTO's place in a response.** A controller returns a record. An
entity returned directly leaks column names into a public contract and turns a rename into a
client release.

### Naming

```
<feature>/XController.java        auth/AuthController.java
<feature>/XService.java           dispatch/DispatchService.java
<feature>/XRepository.java        auth/UserRepository.java
<feature>/dto/XRequest.java       auth/dto/LoginRequest.java      (record)
<feature>/dto/XResponse.java      trip/dto/TripResponse.java      (record)
<feature>/domain/X.java           trip/domain/Trip.java, TripStatus.java
```

DTOs are records: immutable, no Lombok needed, validation annotations on the components.

### Comment convention

One or two lines, above the thing, saying **why** — not what. The code says what.

```java
// One row per login, not per user: deleting on login signs the same person out on other devices.
RefreshToken token = new RefreshToken();
```

Not a paragraph, not a Javadoc block on every method. A comment earns its place when the code
looks wrong until you know the reason. If it restates the line below it, delete it.

## 2. Auth module — **built**

```
auth/AuthController
auth/AuthService
auth/{User,RefreshToken,UserToken}Repository
auth/dto/{Register,Login,Logout,RefreshToken}{Request,Response}
auth/domain/{User,UserRole,UserStatus,AppContext,RefreshToken,UserToken,TokenPurpose}
auth/domain/EmailAlreadyExistsException
platform/security/{JwtService,JwtAuthenticationFilter,JwtPrincipal,SecurityConfig,PasswordConfig}
platform/error/GlobalExceptionHandler
```

### AuthService

| Method | Transaction | Business rules enforced |
|---|---|---|
| `register` | write | Role must be self-registerable; email lowercased and unique; status `PENDING`; verification token stored hashed, raw returned once |
| `login` | write | BCrypt match; status must be `ACTIVE`; `app.grantableFrom(roles)` non-empty; one refresh row per device |
| `refresh` | write | Token type must be `refresh`; row live and unexpired; roles re-derived from the account; hash rotated in place |

### Token claims

```json
{ "sub": "<ulid>", "email": "...", "roles": ["RIDER"], "app": "RIDER", "tokenType": "access" }
```

`tokenType` exists because without it a week-long refresh token is accepted as an access token on
every endpoint — that was a real bug, fixed in T3. The filter rejects anything that is not `access`.

`roles` is the intersection of the account's roles with the surface's permitted roles, sorted so a
token is reproducible for a given input.

### To finish (T4)

| Endpoint | Rule |
|---|---|
| `POST /auth/logout` | Authenticated. Revokes only the caller's own refresh row — proving ownership is the point |
| `POST /auth/verify` | Hash the raw token, match unconsumed and unexpired, stamp `consumed_at`, set user `ACTIVE` |
| `POST /auth/forgot-password` | Always 202, whether or not the address exists. A different answer is an account-enumeration oracle |
| `POST /auth/reset-password` | Consume token, set hash, revoke every refresh row — a password reset ends every session |
| `GET/DELETE /auth/sessions` | Reads `refresh_tokens` as the device list |

---

## 3. Profiles and onboarding — **schema built, services not**

`registerRider()` must create the `rider_profiles` row in the same transaction as the user. An
account with no profile row is a null check in every screen that follows.

### Driver onboarding machine

```
REGISTERED → PROFILE_SUBMITTED → DOCUMENTS_SUBMITTED → UNDER_REVIEW → APPROVED
                                                                    → REJECTED → DOCUMENTS_SUBMITTED
                                                       APPROVED     → SUSPENDED
```

Lives on `DriverProfile.transitionTo` — **built**. One place, so no service can invent a jump from
`REGISTERED` to `APPROVED`.

Eligibility to receive an offer is not a status read. It is a composite check:

```
onboarding_status == APPROVED
  AND every required document APPROVED and not expired at now()
  AND one ACTIVE vehicle
  AND on duty
```

An approved licence that lapsed yesterday makes a driver ineligible while `status` still says
`APPROVED` — which is why `DriverDocument.isValidAt(Instant)` exists and why a daily expiry sweep is
required. A status column cannot express time.

Per-type seat validation belongs in application code: the SQL check is a flat 1..64 because SQL
cannot see the vehicle type. A hatchback is not a 7-seater.

Documents: `storage_key` is an object key, never a public URL. Access is brokered by the application
with a short-lived signed URL. KYC material behind a guessable URL is the standard way this leaks.

---

## 4. Pricing and rides

### Tables

```
ride_types        code, display_name, seat_capacity, active
pricing_rules     ride_type, service_area, base_fare_minor, per_km_minor, per_min_minor,
                  minimum_fare_minor, surge_multiplier, valid_from, valid_to
ride_requests     rider_id, pickup/destination lat·lng·address, ride_type,
                  status, estimated_fare_minor, currency, route_polyline, requested_at
fare_breakdowns   ride_request_id, line_type, label, amount_minor, sort_order
```

**The fare is lines, not a number.** `BASE`, `DISTANCE`, `TIME`, `SURGE`, `DISCOUNT`, `TAX`,
`TOLL` — each an append-only row. A single `total` column cannot answer "why did my fare change",
which is differentiator #3 in [17](17-RideX-Differentiators.md), and cannot carry a discount without
losing what it was applied to.

### Estimation

```
distance, duration ← MapsProvider.route()   (cached in Redis, rounded coordinates)
base + distance·rate + duration·rate
× surge (from pricing_rules, never from a client field)
apply discount lines
max(subtotal, minimum_fare)
```

Money is `BIGINT` minor units with an explicit currency. Rounding happens once, at the end, on the
total — rounding each line accumulates error the rider can see.

An estimate is quoted with a short expiry and stored. The final fare is recomputed server-side at
completion from the actual distance and time; the estimate is what the rider agreed to, and the gap
between the two is what has to be explained rather than hidden.

### Cancellation

A policy table, not `if` statements: who cancelled, in which state, how long after assignment, fee
amount. It changes as often as marketing does, so it is data.

---

## 5. Dispatch

```
ride_offers   ride_request_id, driver_id, status, offered_at, expires_at,
              responded_at, sequence
```

### Offer claim — the concurrency point

```sql
UPDATE ride_offers
   SET status = 'ACCEPTED', responded_at = now()
 WHERE id = ? AND status = 'OFFERED' AND expires_at > now()
```

Zero rows updated means the offer was already taken or expired — the caller gets 409. One statement,
one row, the database as arbiter. A read-then-write, an application lock or an in-memory set all
lose a race that happens every day at rush hour.

The trip is created in the same transaction as the winning claim. Two drivers physically cannot end
up on one ride.

### Selection

Redis `GEOSEARCH` for on-duty drivers within a radius, filtered by the eligibility rule in §3,
ordered by distance, then offered in waves — a small batch, then widen. Broadcasting to everyone
optimises for the platform and trains drivers to ignore offers.

Expiry is server-issued. The countdown on the phone renders a server timestamp.

---

## 6. Trip

```
trips                ride_request_id, rider_id, driver_id, vehicle_id, status,
                     started_at, completed_at, final_fare_minor, actual_polyline, version
trip_status_history  trip_id, from_status, to_status, actor_type, actor_id, reason, occurred_at
trip_locations       trip_id, lat, lng, recorded_at        -- trip-scoped only, not live pings
```

`version` is `@Version` optimistic locking. Two concurrent commands on one trip — a rider cancelling
as a driver starts — must not both win.

Every transition, in one transaction: validate against the machine, write the state, append
`trip_status_history`, enqueue outbox rows. `trip_status_history` is append-only and is what answers
a dispute; a `status` column alone cannot say when or by whom.

Completion emits a domain event. Payment, earnings, invoice and notification react to it — none run
inside the completing transaction, so a payment provider timeout cannot block a driver from ending a
trip.

---

## 7. Payments

```
payments        trip_id, amount_minor, currency, status, provider,
                provider_payment_id UK, idempotency_key UK, created_at
payment_events  payment_id, provider_event_id UK, event_type, payload, received_at
refunds         payment_id, amount_minor, reason, status, provider_refund_id UK
```

### Provider interface

```java
createPaymentIntent · confirmPayment · refundPayment · verifyWebhook · parseWebhook · getPayment
```

Provider-neutral by design; the port is `payment/PaymentProvider` and each implementation lives in `payment/<provider>/`.

### Webhook handling

```
verify signature            -- before parsing; an unverified body is attacker input
insert payment_events       -- unique on provider_event_id
  duplicate → return 200, do nothing
apply state change + append ledger rows, one transaction
return 200
```

Dedup is a unique constraint, not an `if exists` check — the same event arrives twice concurrently.
Return 200 once recorded, or the provider retries forever. A reconciliation job polls provider state
for payments stuck pending, because a webhook that is never delivered otherwise means a payment
nobody notices.

### Ledger

```
ledger_accounts  owner_type (RIDER|DRIVER|PLATFORM|PROMO), owner_id, currency, account_type
ledger_entries   account_id, direction (DEBIT|CREDIT), amount_minor, currency,
                 reference_type, reference_id, idempotency_key UK, created_at
```

Append-only. Balance is `SUM`, or a cached row updated in the same transaction under `@Version` —
never a column edited in place. Every entry goes through one `LedgerService.post()`, or the books
stop balancing and no one finds out for a month.

Wallet, promotional credit, driver earnings and platform fees are account types in this one ledger,
not four subsystems.

---

## 8. Promotions

```
promotions             code_required, discount_type (PERCENT|FIXED), value,
                       max_discount_minor, min_fare_minor, valid_from, valid_to,
                       ride_types, service_areas, first_ride_only,
                       usage_cap_total, usage_cap_per_user, active
coupon_codes           promotion_id, code UK, single_use, assigned_user_id
promotion_redemptions  promotion_id, user_id, ride_request_id, code,
                       discount_minor, status (RESERVED|COMMITTED|RELEASED), created_at
```

Three tables because they are three things: the campaign rule, the redeemable string, and the fact
of redemption. Collapsing them means a shared code cannot have per-user limits.

`DiscountEvaluator` returns a `DISCOUNT` line into `fare_breakdowns`. It never mutates a total — the
rider must be able to see what was taken off and from what.

Lifecycle: reserved at ride request, committed at trip completion, released on cancel. Without the
reservation step a rider abandoning a booking silently burns their coupon.

Concurrency: per-user cap is a unique index on `(promotion_id, user_id)`; global cap needs
`SELECT ... FOR UPDATE` on the promotion row. A count-then-insert is a race, and promo abuse is
automated within a week of launch.

---

## 9. Shuttle

```
routes             name, service_area_id, active
route_stops        route_id, sequence, name, lat, lng, offset_minutes
shuttle_schedules  route_id, recurrence, departure_time, vehicle_type, active
shuttle_trips      schedule_id, service_date, driver_id, vehicle_id,
                   seats_total, seats_booked, status, version
shuttle_bookings   shuttle_trip_id, rider_id, boarding_stop_id, alighting_stop_id,
                   seats, fare_minor, status
route_fares        route_id, from_stop_id, to_stop_id, fare_minor
```

**This is seat inventory, not dispatch.** No offers, no driver search. Booking decrements
`seats_booked` under `@Version` or a `CHECK (seats_booked <= seats_total)`; the constraint is what
actually prevents overbooking.

Fares come from a stop-pair table or per-km along the route — fixed and published, not surge.

Reuses: trip state machine, payments, ledger, promotions, notifications. Does not reuse: dispatch,
dynamic pricing.

**Do not add a `type` column to `trips` and branch on it.** That decision quietly puts a conditional
in every service in the codebase. Either separate tables or a proper supertype — recorded as an ADR
before the first migration.

---

## 10. Notifications

```
notification_outbox        event_type, recipient_user_id, channel, payload,
                           status, attempts, next_attempt_at, locked_at, created_at
notification_templates     event_type, channel, locale, subject, body
notification_preferences   user_id, event_type, channel, enabled
device_tokens              user_id, token UK, platform, app_context, last_seen_at
```

The outbox row is written **in the business transaction**. Not after, not on an in-memory bus — a
completed trip that failed to notify is a support call, and a rolled-back trip that did notify is
worse.

Worker claim:

```sql
SELECT * FROM notification_outbox
 WHERE status = 'PENDING' AND next_attempt_at <= now()
 ORDER BY created_at
 LIMIT 50
   FOR UPDATE SKIP LOCKED
```

`SKIP LOCKED` lets several API nodes run the worker without duplicating sends.

One `NotificationChannel` interface, three implementations. Preferences are enforced in the
dispatcher, with a hard-coded transactional set — payment, safety, account security — that ignores
them. A rider cannot unsubscribe from a receipt.

Device tokens are deleted on an FCM 404/410. Stale tokens otherwise grow until every send is mostly
failures.

---

## 11. Invoices

```
invoices  number UK, trip_id, issued_at, currency, subtotal_minor, tax_minor, total_minor,
          buyer_snapshot JSONB, line_snapshot JSONB, pdf_storage_key, status
```

**Snapshot, never join.** The rider's name, address and every fare line are copied in at issue. A
driver renaming themselves must not rewrite last year's invoice — a joined invoice is not a record,
it is a query.

Sequential number from a DB sequence, per year. Immutable once issued; a correction is a credit note.
PDF rendered from HTML at issue, stored in object storage, served by short-lived signed URL.

---

## 12. Admin and audit

```
audit_logs  actor_user_id, action, target_type, target_id, before JSONB, after JSONB,
            reason, ip_address, occurred_at
```

Written by an interceptor around admin mutations, not by each endpoint remembering to. The one that
forgets is always the refund endpoint.

`reason` is mandatory on destructive actions — refunds, suspensions, document rejections, flag
flips, role changes. The console already routes all of them through `ConfirmWithReason`; the API must
reject a missing reason rather than trusting the client to have asked.

Support raises cases, finance releases money. Keeping those permissions separate is the control
against the most common internal-fraud pattern in a marketplace.

---

## 13. Cross-cutting mechanics

### Idempotency

```
idempotency_keys  key, user_id, endpoint, request_hash, response_status,
                  response_body, created_at    -- PK (key, user_id)
```

A filter on every mutating POST from a mobile client. Same key and same request hash returns the
stored response; same key with a different body is a 422. Without this, one bad tunnel produces two
rides and two charges.

### Rate limiting

Bucket4j over Redis. Auth, OTP, password reset, fare estimate and `/maps/**` — the last because it
is an unmetered proxy to a billed API.

### Error contract

RFC 7807 `ProblemDetail` everywhere — **built**. Validation failures add an `errors` map.

The Phase-0 handler maps `IllegalArgumentException` to 400 and `IllegalStateException` to 409
globally. That is a convenience with a short life: replace it with a domain exception hierarchy
(`DomainException` → `NotFound`, `Conflict`, `Forbidden`, `Validation`) before the trip and payment
modules land, or unrelated failures will share a status code.

### Concurrency summary

| Contention | Mechanism |
|---|---|
| Two drivers, one offer | Conditional `UPDATE ... WHERE status = 'OFFERED'` |
| Concurrent trip commands | `@Version` on `trips` |
| Promotion global cap | `SELECT ... FOR UPDATE` on the promotion row |
| Promotion per-user cap | Unique index on `(promotion_id, user_id)` |
| Shuttle seats | `@Version` plus `CHECK (seats_booked <= seats_total)` |
| Duplicate registration | Unique index, with the constraint violation mapped to 409 |
| Duplicate webhook | Unique index on `provider_event_id` |
| Outbox workers | `FOR UPDATE SKIP LOCKED` |

Every row in that table is a database guarantee. None of them is an application-level check, because
an application-level check is a race with extra steps.

### Testing

| Kind | Tool | Covers |
|---|---|---|
| Unit | JUnit 5 + Mockito | State machines, fare maths, discount evaluation, eligibility |
| Integration | Testcontainers + Postgres | Migrations, repositories, constraint behaviour |
| Web | `@WebMvcTest` | Status codes, validation, the `ProblemDetail` shape |
| Security | `spring-security-test` | Protected route returns 401; wrong role returns 403 |
| Concurrency | Two threads, one Testcontainer | Offer claim, seat booking, promotion cap |

The concurrency row is the one teams skip and the one that matters. A dispatch race is untestable
against H2 and unfindable in production until it has already double-booked a car — which is why
H2 has to go.
