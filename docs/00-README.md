# RideX B2C — Project Documentation

RideX is a consumer-first ride-hailing and mobility platform inspired by the core experience of Uber, Ola and inDrive, while deliberately leaving room for differentiated mobility features.

## Product decision

RideX is **B2C, not SaaS multi-tenant**.

There is one RideX platform, one platform database, one consumer identity system, one driver identity system, and one operations/admin system.

Business operators, fleets and drivers are managed as platform entities rather than isolated tenants.

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

Do not carry forward the old tenant_id architecture into the fresh B2C design. Keep only reusable concepts such as users, authentication, subscriptions if applicable to platform products, payments, notifications and audit logging.

## Documentation index

1. Project overview
2. Product requirements
3. Use cases
4. Business rules
5. Functional requirements
6. Non-functional requirements
7. Roles and permissions
8. Backend architecture
9. ERD
10. API contract
11. State machines
12. Notification matrix
13. Payment architecture
14. Security
15. Phase-by-phase delivery plan
16. Edge cases and error catalog
17. Differentiating RideX ideas
18. Future project ideas
19. Technology stack
20. ADRs
21. Gap analysis and task list
22. Partner app design
23. Admin panel design
24. High-level design (HLD)
25. Low-level design (LLD)
26. Build task list
27. Unique feature set

## Where to start

| You want to | Read |
|---|---|
| Understand the product | 01, 02, 03 |
| Understand the system | 24 (HLD), then 08 |
| Build something | 26 (task list), then 25 (LLD) |
| Know what is already done | 21 |
| Know what makes RideX different | 27 |
