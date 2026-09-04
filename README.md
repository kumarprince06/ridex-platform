# RideX

### Consumer ride-hailing and mobility platform

RideX is a B2C mobility platform: riders request transportation, drivers accept and complete
trips, and platform operations manage the marketplace. Built with Java 21 and Spring Boot.

---

## Status

**Phase:** 0 — Fresh Foundation
**Architecture:** Modular monolith, single platform database
**Backend:** Java 21 + Spring Boot
**Database:** PostgreSQL + Flyway
**Cache / transient state:** Redis

Current work and known gaps are tracked in [docs/21-Gap-Tasks.md](docs/21-Gap-Tasks.md).
The ordered next steps are [docs/26-Build-Task-List.md](docs/26-Build-Task-List.md).

---

## Product decision

RideX is **B2C, not multi-tenant SaaS.**

One platform, one database, one consumer identity system, one driver identity system, one
operations system. Fleets and business operators are modelled as platform entities, not as
isolated tenants.

This reverses an earlier multi-tenant design. The reason is recorded in
[ADR-001](docs/20-ADRs.md) — in short, a public rider/driver signup has no tenant context at
registration time, so the tenant boundary and the identity boundary could not coexist.

Do not reintroduce `tenant_id` into the schema.

---

## Surfaces

| Surface | Location | State |
|---|---|---|
| Backend API | [ridex-backend/](ridex-backend/) | Phase 0 — auth and profile schema |
| Rider mobile app | [ridex-rider-app/](ridex-rider-app/) | Static UI, not wired to the API |
| Driver mobile app | [ridex-partner-app/](ridex-partner-app/) | Static UI, not wired to the API |
| Admin / operations web | [ridex-admin-web/](ridex-admin-web/) | Static UI, not wired to the API |

One repository on purpose. The API contract is shared, so a backend change and its client update
belong in the same commit; splitting them into separate repos only lets them drift.

---

## Architecture

Package by feature, one deployable:

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

Each feature owns its controller, service, repository, DTOs and domain model. `<feature>/domain/`
holds the entities and rules and imports no Spring, so fare maths and state machines test without
booting a context. A feature reaches another through its service, never at its `domain/` classes.

Enforced by `PackageStructureTest` (ArchUnit) — a violation fails the build.

System-level design: [docs/24-HLD-High-Level-Design.md](docs/24-HLD-High-Level-Design.md).
Class and table level: [docs/25-LLD-Low-Level-Design.md](docs/25-LLD-Low-Level-Design.md).
Module conventions: [docs/08-Backend-Architecture.md](docs/08-Backend-Architecture.md).

---

## Technology

**Backend** — Java 21, Spring Boot 3.x, Spring Security, Spring Data JPA, Flyway, PostgreSQL,
Redis, Maven

**Web** — React, TypeScript, Vite, TanStack Query, React Hook Form, Zod

**Mobile** — React Native, TypeScript, React Navigation, secure token storage

**Testing** — JUnit 5, Mockito, Spring Boot Test, Testcontainers

Deliberately **not** used: Kafka, Kubernetes, microservices, a general event bus. Start as a
modular monolith with Redis; split only when scale or team boundaries justify it.

Full stack: [docs/19-Technology-Stack.md](docs/19-Technology-Stack.md).

---

## Getting started

**Prerequisites:** Java 21, Docker, Maven (or the bundled wrapper).

```bash
git clone <repo-url>
cd ridex-platform

# Postgres + Redis + Mailpit
export RIDEX_APP_PASSWORD=ridex_local
docker compose up -d

cd ridex-backend
./mvnw spring-boot:run
```

Health check: `http://localhost:8080/actuator/health`
Local mail UI: `http://localhost:8025`

### Required environment

| Variable | Purpose |
|---|---|
| `RIDEX_APP_PASSWORD` | Postgres password for the `ridex_app` role |
| `RIDEX_JWT_SECRET` | JWT signing key. Must be set outside local development |

---

## Database

PostgreSQL, shared schema, no tenant partitioning. Flyway owns the schema; migrations live in
`ridex-backend/src/main/resources/db/migration` and are never edited after being applied to a
shared environment.

Conventions:

- ULID primary keys, `VARCHAR(26)`
- `TIMESTAMPTZ` for every instant, stored in UTC, converted at the edge
- Financial history is append-only — no destructive updates

Target model: [docs/09-Project-ERD.md](docs/09-Project-ERD.md).

---

## Security

- Short-lived JWT access tokens, rotating refresh tokens
- Refresh, verification and reset tokens stored hashed, never logged
- BCrypt password hashing
- Permission-based authorization, roles as the UI representation
- Default-deny on API routes; ownership checked on every client-supplied ID

Full policy: [docs/14-Security.md](docs/14-Security.md).

---

## Testing

Every task lands with its test. Unit tests for domain and application logic; Testcontainers
integration tests for anything touching the schema; security tests asserting that protected
routes reject unauthenticated calls.

```bash
cd ridex-backend
./mvnw test
```

---

## Documentation

| # | Document |
|---|---|
| 00 | [Project documentation index](docs/00-README.md) |
| 01 | [Project overview](docs/01-Project-Overview.md) |
| 02 | [Project requirements](docs/02-Project-Requirements.md) |
| 03 | [Use cases](docs/03-Use-Cases.md) |
| 04 | [Business rules](docs/04-Business-Rules.md) |
| 05 | [Functional requirements](docs/05-Functional-Requirements.md) |
| 06 | [Non-functional requirements](docs/06-Non-Functional-Requirements.md) |
| 07 | [Roles and permissions](docs/07-Roles-and-Permissions.md) |
| 08 | [Backend architecture](docs/08-Backend-Architecture.md) |
| 09 | [ERD](docs/09-Project-ERD.md) |
| 10 | [API contract](docs/10-API-Contract.md) |
| 11 | [State machines](docs/11-State-Machines.md) |
| 12 | [Notification matrix](docs/12-Notification-Matrix.md) |
| 13 | [Payment architecture](docs/13-Payment-Architecture.md) |
| 14 | [Security](docs/14-Security.md) |
| 15 | [Phase plan](docs/15-Phase-Plan.md) |
| 16 | [Edge cases and errors](docs/16-Edge-Cases-and-Errors.md) |
| 17 | [Differentiators](docs/17-RideX-Differentiators.md) |
| 18 | [Future ideas](docs/18-Future-Project-Ideas.md) |
| 19 | [Technology stack](docs/19-Technology-Stack.md) |
| 20 | [ADRs](docs/20-ADRs.md) |
| 21 | [Gap analysis and tasks](docs/21-Gap-Tasks.md) |
| 22 | [Partner app design](docs/22-Partner-App-Design.md) |
| 23 | [Admin panel design](docs/23-Admin-Panel-Design.md) |
| 24 | [High-level design](docs/24-HLD-High-Level-Design.md) |
| 25 | [Low-level design](docs/25-LLD-Low-Level-Design.md) |
| 26 | [Build task list](docs/26-Build-Task-List.md) |
| 27 | [Unique feature set](docs/27-Unique-Feature-Set.md) |

---

## Delivery rule

Finish and verify each phase before starting the next. A phase is complete only when its happy
path, failure path and persistence behaviour work end-to-end.

Phase breakdown: [docs/15-Phase-Plan.md](docs/15-Phase-Plan.md).
