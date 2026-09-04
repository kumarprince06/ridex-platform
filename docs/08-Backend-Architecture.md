# RideX B2C — Backend Architecture

## Architectural style

Package by feature, with layers inside each feature. One folder per module; everything that
module needs lives in it.

- `<feature>/` — controller, service and repository for that feature
- `<feature>/dto/` — request and response records for that feature's endpoints
- `<feature>/domain/` — entities, enums, state machines. **No Spring imports**, so the rules
  test without booting a context
- `platform/` — security, error handling, correlation IDs: cross-cutting, owned by no feature
- `shared/` — primitives used by more than one feature (Money, ULIDs, hashing)

Superseded the earlier `api / application / domain / infrastructure` split, which spread one
feature across four top-level folders and left module boundaries invisible. See ADR-009.

## Suggested modules

auth
user
rider
driver
vehicle
trip
dispatch
pricing
payment
billing
payout
notification
support
promotion
location
admin
media
audit

## Example package shape

```
com.ridex
├── auth/            AuthController, AuthService, repositories, dto/, domain/
├── rider/           rider profile
├── driver/          onboarding, documents
├── vehicle/         vehicles
├── maps/            MapsProvider port, dto/, domain/, google/
├── platform/        security, error handling — cross-cutting, owned by no feature
└── shared/          primitives used by more than one feature
```

As modules arrive they are siblings: `trip/`, `dispatch/`, `pricing/`, `payment/`, `payout/`,
`wallet/`, `promotion/`, `notification/`, `invoice/`, `shuttle/`, `support/`, `admin/`, `audit/`.

## Important separation

`<feature>/domain/` must not depend on:
- Spring, in any form
- email SDKs, payment SDKs, HTTP types

JPA annotations are the one accepted exception: the entities are the domain model, and a second
set of mapping classes would be two models to keep in step.

A feature reaches another feature through its **service**, never straight at its `domain/`
classes. That is the rule that keeps modules separable later.

All three rules are enforced by `PackageStructureTest` (ArchUnit), so a violation fails the build
rather than waiting to be noticed in review.

## Async processing

Use asynchronous processing for:
- notifications
- receipt generation
- payout initiation
- webhook follow-up work
- analytics/event processing
- non-critical external API calls

Do not make the core trip state machine dependent on an email provider being available.
