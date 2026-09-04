# RideX B2C — Initial Architecture Decisions

## ADR-001: B2C instead of multi-tenant SaaS
Decision: RideX is one consumer mobility platform. Businesses/fleets are platform entities.

Reason: the multi-tenant model broke down at registration. A rider or driver signs up from a
public app with no tenant context, but every tenant-scoped table needs a `tenant_id` at insert
time. Resolving the tenant *after* identity meant either inventing a placeholder tenant per
signup or asking consumers which business they belong to, and neither is a real consumer
product. The tenant boundary and the identity boundary were in direct conflict.

Also avoids unnecessary tenant isolation complexity and matches the intended Uber/Ola/inDrive
style product.

Consequence: the tenant/subscription/settlement layer built before this decision is removed
rather than adapted. See `docs/21-Gap-Tasks.md`.

## ADR-002: Modular monolith first
Decision: One Spring Boot deployable with strict domain modules.

Reason: faster development, simpler transactions and deployment. Architecture remains extractable later.

## ADR-003: PostgreSQL as source of truth
Decision: relational transactional store.

## ADR-004: Redis for transient/high-speed state
Use for caching, rate limiting, short-lived dispatch/location state and queue support.

## ADR-005: Event-driven notifications with durable delivery
Business actions may publish domain events, but critical outbound events should be persisted through an outbox before asynchronous delivery.

## ADR-006: Provider abstractions
Payment, maps, messaging and storage providers must be behind interfaces so providers can change without changing domain logic.

## ADR-007: Immutable financial history
Payment, refund, earnings and payout records must remain auditable. Avoid destructive updates to financial history.

## ADR-008: UTC timestamps
Persist instants in UTC. Convert for display at the edge.

---

## ADR-009 — Package by feature, not by layer

**Date:** 2026-09-05 · **Status:** accepted

### Context

The backend was packaged `api / application / domain / infrastructure / shared`. Three problems
showed up once there was enough code to judge it:

- One feature was spread across four top-level folders, so adding an endpoint meant editing in
  four places.
- Module boundaries were invisible. Nothing in the tree said whether dispatch depended on pricing.
- The dependency rule was violated anyway — `application` imported `api.dto`, and `api` imported
  `infrastructure.maps` directly, skipping the application layer.

RideX plans eighteen modules. Layer-first packaging ends with one `application/` folder holding
sixty unrelated services.

### Decision

Package by feature: `auth/`, `driver/`, `trip/`, `payment/` and so on, each holding its own
controller, service, repository, `dto/` and `domain/`. Cross-cutting concerns go in `platform/`;
genuinely shared primitives in `shared/`.

`<feature>/domain/` keeps the layer discipline that mattered: no Spring imports, so state machines
and fare maths test without a context.

Enforced by `PackageStructureTest` (ArchUnit) — the structure fails the build rather than relying
on review.

### Consequences

- Adding or deleting a feature is one folder.
- The tree is the module map; a cross-module dependency is visible as an import across folders.
- Splitting a module into a service later is a folder move, not an archaeology exercise.
- Cost: a 45-file repackaging, done while it was an hour's work. At Step 10 it would have been a
  week and would not have happened.

### Rejected

- **`controller/service/repository/entity`** — the conventional Spring layout. Fine for CRUD, but
  at eighteen modules it produces one folder of sixty services with no boundary between them.
- **Keeping layer-first and only fixing the leaks** — cheaper today, but leaves each feature spread
  across four folders and module boundaries unenforceable.

---

## ADR-010 — Shuttle as its own tables, not a type on trips

**Date:** 2026-09-05 · **Status:** accepted

### Context

Shuttle is a scheduled vehicle with numbered seats. On-demand is a search for a driver. They share
riders, payments, points and support, and share nothing about how a seat or a car is allocated.

The tempting shortcut is `trips.type = 'SHUTTLE'`.

### Decision

Separate tables: `routes`, `route_stops`, `route_fares`, `shuttle_schedules`, `shuttle_trips`,
`shuttle_bookings`, plus `pass_products` and `passes`.

### Consequences

- Dispatch, offers and surge do not exist for shuttle, and no shuttle code has to explain why.
- Seat allocation is a unique index on `(shuttle_trip_id, seat_label)`, which has no meaning at all
  for an on-demand ride.
- Payments, points, support and the QR/OTP boarding rule are shared, because those genuinely are
  the same thing.
- Cost: two booking flows to maintain, and two places that create a payment.

### Rejected

**A `type` column on `trips`.** It would put a conditional in every service in the codebase, and it
is the kind of decision that ruins a codebase slowly enough that nobody can point at when it
happened. The saving is a few tables; the cost is every future reader having to know which half of
each method applies to them.

---

## ADR-011 — Riders earn points, drivers earn money

**Date:** 2026-09-05 · **Status:** accepted

### Context

Both riders and drivers can refer. Paying both in the same currency is simpler.

### Decision

The **referrer's role** decides the reward. A rider referring anybody earns points; a driver
referring anybody earns cash, credited to their earnings ledger and settled with their next payout.

Rider referrals qualify on the referee's first completed ride. Driver referrals qualify on a run of
completed trips (25 by default) inside a window (30 days), both admin-editable.

### Consequences

- A rider gets something they want - cheaper rides - and it costs the platform a discount it sets
  the value of. Points never leave the platform.
- A driver gets income, which is the only thing their relationship with the platform is about. Ride
  discounts would be worthless to them.
- Driver supply is the constraint in this business, so the referral that solves the expensive
  problem is the one that pays real money.
- Cash referrals are the first thing anyone farms, hence the much higher bar, the deadline, and
  crediting the ledger rather than paying instantly - which is what makes a clawback possible.

### Rejected

- **Points for everyone.** A driver cannot use ride discounts, so the reward would not motivate the
  referral that matters most.
- **Cash for everyone.** A rider referral is cheap to manufacture and would be farmed immediately.
- **Paying on signup.** That buys accounts, not riders or drivers.

