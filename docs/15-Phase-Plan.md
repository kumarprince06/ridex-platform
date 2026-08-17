# RideX B2C — Phase-by-Phase Delivery Plan

## Phase 0 — Fresh Foundation
Goal: establish the new B2C architecture without tenant SaaS baggage.

Deliver:
- new database
- Flyway baseline
- modular packages
- users/auth
- roles/permissions
- configuration
- Docker/local development
- CI

Done when:
- application starts
- migrations pass
- registration/login/refresh/logout work
- security tests pass

## Phase 1 — Identity + Profiles
Deliver:
- rider profile
- driver profile
- verification
- password reset
- device/session management

## Phase 2 — Driver Onboarding
Deliver:
- KYC
- documents
- vehicle
- approval workflow
- driver status

## Phase 3 — Maps + Location
Deliver:
- geocoding
- route estimate
- distance/duration
- driver location
- service area foundation

## Phase 4 — Ride Request + Pricing
Deliver:
- ride types
- fare estimation
- pricing rules
- ride request state machine
- cancellation rules

## Phase 5 — Dispatch
Deliver:
- eligible driver search
- offer creation
- acceptance/rejection
- timeout
- reassignment
- concurrency protection

## Phase 6 — Live Trip
Deliver:
- driver arriving
- pickup
- start
- live tracking
- complete
- trip history

## Phase 7 — Payments + Receipts
Deliver:
- payment provider
- payment intents
- webhooks
- receipts
- refunds
- reconciliation

## Phase 8 — Driver Earnings + Payout
Deliver:
- earnings
- commission
- adjustments
- settlement
- payout
- reconciliation

## Phase 9 — Notifications
Deliver:
- notification events
- outbox
- email
- push
- SMS abstraction
- templates/preferences

## Phase 10 — Admin/Ops
Deliver:
- dashboard
- live trip map
- driver management
- rider management
- payments
- refunds
- support
- audit

## Phase 11 — Differentiators
Choose 2–3 differentiators and validate them before building many.

## Phase 12 — Production Hardening
Deliver:
- load tests
- security testing
- observability
- backups
- disaster recovery
- CI/CD
- mobile release readiness

## Delivery rule

Finish and verify each phase before starting the next. A phase is complete only when its happy path, failure path and persistence behavior work end-to-end.
