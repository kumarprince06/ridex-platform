# RideX B2C — Project Documentation

RideX is a consumer-first ride-hailing and mobility platform inspired by the core experience of Uber, Ola and inDrive, while deliberately leaving room for differentiated mobility features.

## Product decision

RideX is a consumer mobility platform.

There is one RideX platform, one platform database, one consumer identity system, one driver identity system, and one operations/admin system.

Business operators, fleets and drivers are platform entities.

## Core surfaces

- Rider mobile app
- Driver mobile app
- Admin/operations web panel
- Backend API
- Background workers
- Notification infrastructure
- Payment infrastructure
- Maps/location infrastructure

## Recommended stack

- Backend: Java 21 + Spring Boot 3.x
- Database: PostgreSQL
- Migrations: Flyway
- Cache/queues: Redis + Spring/worker processing
- Authentication: JWT access token + rotating refresh token
- Frontend: React + TypeScript for web admin
- Mobile: React Native + TypeScript
- Maps: provider abstraction, initially Google Maps or Mapbox
- Object storage: S3-compatible storage
- API documentation: OpenAPI
- Observability: structured logs + metrics + tracing
- Deployment: Docker + CI/CD

## Important architectural principle

Keep the reusable concepts: users, authentication, payments, notifications and audit logging.

## Documentation index

- 1 · [Project overview](01-Project-Overview.md)
- 2 · [Product requirements](02-Project-Requirements.md)
- 3 · [Use cases](03-Use-Cases.md)
- 4 · [Business rules](04-Business-Rules.md)
- 5 · [Functional requirements](05-Functional-Requirements.md)
- 6 · [Non-functional requirements](06-Non-Functional-Requirements.md)
- 7 · [Roles and permissions](07-Roles-and-Permissions.md)
- 8 · [Backend architecture](08-Backend-Architecture.md)
- 9 · [ERD](09-Project-ERD.md)
- 10 · [API contract](10-API-Contract.md)
- 11 · [State machines](11-State-Machines.md)
- 12 · [Notification matrix](12-Notification-Matrix.md)
- 13 · [Payment architecture](13-Payment-Architecture.md)
- 14 · [Security](14-Security.md)
- 15 · [Phase-by-phase delivery plan](15-Phase-Plan.md)
- 16 · [Edge cases and error catalog](16-Edge-Cases-and-Errors.md)
- 17 · [Differentiating RideX ideas](17-RideX-Differentiators.md)
- 18 · [Future project ideas](18-Future-Project-Ideas.md)
- 19 · [Technology stack](19-Technology-Stack.md)
- 20 · [ADRs](20-ADRs.md)
- 22 · [Partner app design](22-Partner-App-Design.md)
- 23 · [Admin panel design](23-Admin-Panel-Design.md)
- 24 · [High-level design (HLD)](24-HLD-High-Level-Design.md)
- 25 · [Low-level design (LLD)](25-LLD-Low-Level-Design.md)
- 26 · [Build task list](26-Build-Task-List.md)
- 27 · [Unique feature set](27-Unique-Feature-Set.md)
- 31 · [Deployment and CI/CD](31-Deployment-and-CI-CD.md)
- 32 · [Business readiness and new lines](32-Business-Readiness-and-New-Lines.md)
- 34 · [Module task board](34-Module-Task-Board.md)
- 35 · [Runtime flow](35-Runtime-Flow.md)

## Where to start

| You want to | Read |
|---|---|
| Understand the product | 01, 02, 03 |
| Understand the system | 24 (HLD), then 08 |
| Build something | 26 (task list), then 25 (LLD) |
| Know what is already done | 34 |
| Know what makes RideX different | 27 |
