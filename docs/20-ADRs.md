# RideX B2C — Initial Architecture Decisions

## ADR-001: B2C instead of multi-tenant SaaS
Decision: RideX is one consumer mobility platform. Businesses/fleets are platform entities.

Reason: avoids unnecessary tenant isolation complexity and matches the intended Uber/Ola/inDrive-style product.

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
