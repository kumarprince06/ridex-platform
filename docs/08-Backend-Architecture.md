# RideX B2C — Backend Architecture

## Architectural style

Use modular layered architecture:

- api: HTTP/WebSocket controllers, request/response DTOs
- application: use cases and orchestration
- domain: business entities, value objects, domain services, domain events
- infrastructure: JPA, Redis, messaging, payment providers, maps, storage, mail
- shared: cross-cutting primitives only

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

com.ridex
├── api
│   ├── auth
│   ├── rider
│   ├── driver
│   ├── trip
│   ├── payment
│   └── admin
├── application
│   ├── auth
│   ├── trip
│   ├── dispatch
│   ├── payment
│   └── ...
├── domain
│   ├── user
│   ├── rider
│   ├── driver
│   ├── trip
│   ├── dispatch
│   └── ...
├── infrastructure
│   ├── persistence
│   ├── security
│   ├── payment
│   ├── maps
│   ├── messaging
│   ├── storage
│   └── ...
└── shared

## Important separation

The domain must not depend on:
- Spring MVC
- email SDKs
- payment SDKs
- PostgreSQL/JPA implementation details where avoidable

Application services depend on domain abstractions. Infrastructure implements those abstractions.

## Async processing

Use asynchronous processing for:
- notifications
- receipt generation
- payout initiation
- webhook follow-up work
- analytics/event processing
- non-critical external API calls

Do not make the core trip state machine dependent on an email provider being available.
