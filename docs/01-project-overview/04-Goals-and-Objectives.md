# RideX — Goals & Objectives

## 1. Purpose

This document defines the goals and measurable objectives of the RideX platform.

The objectives provide direction for product development, architecture, engineering decisions, testing, and deployment.

The goals are divided into:

1. Product Goals
2. Business Goals
3. Technical Goals
4. Reliability Goals
5. Security Goals
6. Performance Goals
7. Testing Goals
8. Operational Goals
9. Learning & Engineering Goals

---

# 2. Product Goals

## PG-01 — Provide a Complete Transportation Platform

RideX should provide the core capabilities required to operate a transportation business from a centralized platform.

The platform should support:

- Tenant management
- Driver management
- Vehicle management
- Rider management
- Ride booking
- Driver dispatch
- Pricing
- Payments
- Notifications
- Reporting

### Success Criteria

A tenant should be able to complete the following workflow without external operational software:

```text
Tenant Registration
        ↓
Tenant Activation
        ↓
Fleet Configuration
        ↓
Driver Registration
        ↓
Vehicle Registration
        ↓
Rider Registration
        ↓
Ride Booking
        ↓
Driver Dispatch
        ↓
Trip Completion
        ↓
Payment
        ↓
Receipt
        ↓
Reporting
```

---

# 3. Multi-Tenant SaaS Goals

## MTG-01 — Support Multiple Independent Tenants

The platform must allow multiple transportation organizations to operate independently on the same application infrastructure.

Each tenant must have isolated:

- Users
- Drivers
- Vehicles
- Riders
- Rides
- Pricing
- Payments
- Operational configuration
- Reports

---

## MTG-02 — Prevent Cross-Tenant Data Access

A request originating from Tenant A must never be able to access or modify Tenant B's business data.

### Success Criteria

The system should reject unauthorized cross-tenant operations at multiple layers where practical:

```text
Request
   ↓
Authentication
   ↓
Tenant Resolution
   ↓
Authorization
   ↓
Business Logic
   ↓
Repository / Database
```

Cross-tenant access should be explicitly tested.

---

## MTG-03 — Support Tenant Configuration

Tenants should be able to configure business behavior without requiring tenant-specific application code.

Examples:

- Pricing
- Vehicle types
- Service areas
- Cancellation policies
- Operating rules
- Notification preferences
- Feature availability

---

# 4. Ride-Hailing Goals

## RHG-01 — Complete Ride Lifecycle

The platform must support the complete ride lifecycle:

```text
REQUESTED
    ↓
SEARCHING_DRIVER
    ↓
DRIVER_ASSIGNED
    ↓
DRIVER_ACCEPTED
    ↓
DRIVER_ARRIVED
    ↓
TRIP_STARTED
    ↓
COMPLETED
```

The system must also support valid failure and cancellation paths.

---

## RHG-02 — Reliable Driver Dispatch

The dispatch system should automatically identify suitable drivers based on configurable criteria.

The initial dispatch system should consider:

- Driver availability
- Driver location
- Vehicle type
- Driver status
- Current ride status
- Service area
- Tenant configuration

---

## RHG-03 — Handle Dispatch Failures

The dispatch system must handle:

- Driver rejection
- Offer timeout
- Driver becoming unavailable
- Driver losing connectivity
- No eligible driver
- Driver reassignment

The system must never leave a ride in an ambiguous state because of a failed dispatch attempt.

---

# 5. Fleet Management Goals

## FMG-01 — Centralized Fleet Management

Tenant administrators should be able to manage:

- Drivers
- Vehicles
- Vehicle types
- Driver documents
- Vehicle documents
- Driver-vehicle assignments

---

## FMG-02 — Driver State Accuracy

The platform must maintain an accurate representation of driver availability.

Example states:

```text
OFFLINE
ONLINE
BUSY
ON_TRIP
SUSPENDED
BLOCKED
```

The dispatch system must not offer rides to drivers who are not eligible.

---

# 6. Pricing Goals

## PRG-01 — Configurable Pricing

Tenants should be able to configure pricing rules without modifying application code.

Pricing should support:

- Base fare
- Distance-based fare
- Time-based fare
- Minimum fare
- Surge
- Discounts
- Taxes
- Cancellation fees

---

## PRG-02 — Reproducible Historical Fares

Once a fare has been calculated and associated with a ride, future pricing configuration changes must not alter the historical calculation.

Example:

```text
Ride #1001

Distance: 10 km
Rate at booking: ₹15/km

Fare:
₹150
```

If the tenant later changes the rate to:

```text
₹20/km
```

Ride #1001 must continue to show the original calculated fare.

---

# 7. Payment Goals

## PAYG-01 — Reliable Payment Processing

The payment system should support:

- Authorization
- Capture
- Failure
- Retry
- Refund
- Partial refund
- Webhook processing
- Reconciliation

---

## PAYG-02 — Idempotent Financial Operations

The system must prevent duplicate payment operations caused by:

- Client retries
- Network failures
- Duplicate requests
- Duplicate webhooks
- Message retries

Financial operations must be safely repeatable where applicable.

---

# 8. Security Goals

## SG-01 — Secure Authentication

The platform must provide secure authentication using industry-standard mechanisms.

Authentication should include:

- Secure password storage
- JWT-based access tokens
- Refresh tokens
- Token expiration
- Account status validation

---

## SG-02 — Role-Based Access Control

The platform must enforce permissions based on user roles.

Initial roles include:

```text
SUPER_ADMIN
TENANT_ADMIN
DISPATCHER
FINANCE
DRIVER
RIDER
```

A user must only be able to perform operations permitted by their role.

---

## SG-03 — Tenant-Level Authorization

Authentication alone must not grant access to tenant data.

The system must validate:

```text
User
+
Role
+
Tenant
+
Resource
+
Action
```

before allowing protected operations.

---

## SG-04 — Auditability

Important administrative and business actions should be auditable.

Audit records should capture information such as:

- Actor
- Tenant
- Action
- Resource
- Resource ID
- Timestamp
- Previous state where applicable
- New state where applicable

---

# 9. Performance Goals

Performance targets should be treated as initial engineering targets and validated through load testing rather than assumed to represent production capacity.

## PERF-01 — API Response Time

For normal synchronous APIs, the initial target is:

```text
P50 ≤ 200 ms
P95 ≤ 500 ms
P99 ≤ 1 second
```

excluding intentionally long-running operations and external systems whose latency is outside the application's direct control.

---

## PERF-02 — Database Performance

Frequently executed queries should be analyzed using:

- Query plans
- Appropriate indexes
- Pagination
- Connection pooling
- Query optimization

No production query should rely on accidental full-table scans for high-volume data.

---

## PERF-03 — Real-Time Location

Driver location updates should not require a database write for every real-time location event.

The architecture should use a system such as Redis for frequently changing location state.

Historical location storage can use a separate persistence strategy.

---

# 10. Scalability Goals

The initial architecture should be designed with the following planning assumptions:

```text
Initial target:

Tenants:        100+
Drivers:        10,000+
Riders:         100,000+
Daily rides:    100,000+
```

These are **engineering planning targets**, not guaranteed production capacity.

The architecture should allow horizontal scaling when workload increases.

---

# 11. Availability Goals

The initial production target should be:

```text
Availability target: 99.9%
```

This corresponds approximately to:

```text
≤ 43.8 minutes of unavailability per 30-day month
```

The target applies to the core platform and should be refined once the production deployment architecture and service-level objectives are finalized.

---

# 12. Reliability Goals

## REL-01 — No Silent Business Failures

Important business operations should have:

- Explicit states
- Error handling
- Logging
- Retry strategy where appropriate
- Failure recovery mechanisms

---

## REL-02 — Idempotent Critical Operations

Operations such as:

- Payment
- Ride creation
- Ride cancellation
- Webhook processing
- Event consumption

should be evaluated for idempotency.

---

## REL-03 — Recoverable Failures

Temporary infrastructure failures should not unnecessarily corrupt business state.

Examples:

```text
Payment gateway unavailable
Redis temporarily unavailable
Kafka consumer failure
Notification provider unavailable
```

The system should define an appropriate recovery strategy for each.

---

# 13. Data Integrity Goals

The system must preserve the correctness of critical business data.

Examples include:

- A completed ride cannot become active again.
- A driver cannot be assigned conflicting rides when business rules prohibit it.
- A payment cannot be captured twice.
- A tenant cannot own duplicate identifiers that violate business constraints.
- A historical fare cannot change after ride completion.

Data integrity should be enforced through a combination of:

- Database constraints
- Transactions
- Validation
- State machines
- Concurrency controls
- Idempotency

---

# 14. Testing Goals

Testing is a first-class engineering requirement.

The project should include:

### Unit Testing

For:

- Domain logic
- Pricing calculations
- State transitions
- Dispatch algorithms
- Validation

### Integration Testing

For:

- PostgreSQL
- Redis
- Kafka
- Security
- Repository behavior

### API Testing

For:

- Authentication
- Authorization
- CRUD operations
- Business workflows
- Error scenarios

### End-to-End Testing

For complete workflows such as:

```text
Rider
 ↓
Book Ride
 ↓
Dispatch
 ↓
Driver Accept
 ↓
Trip
 ↓
Payment
 ↓
Rating
```

### Security Testing

For:

- Authentication bypass
- Authorization bypass
- Cross-tenant access
- Injection
- Token misuse
- Rate limiting

### Performance Testing

For:

- Concurrent ride requests
- Driver location updates
- Dispatch load
- API throughput
- Database load

---

# 15. Observability Goals

The platform should provide sufficient observability to determine:

- What happened?
- Where did it happen?
- Why did it happen?
- Which tenant was affected?
- Which request caused it?
- How long did it take?

The platform should eventually support:

```text
Logs
+
Metrics
+
Distributed Tracing
+
Alerts
```

Every important request should have a correlation/request ID.

---

# 16. DevOps Goals

The project should support automated delivery.

The CI/CD pipeline should eventually perform:

```text
Code Push
    ↓
Build
    ↓
Unit Tests
    ↓
Integration Tests
    ↓
Static Analysis
    ↓
Security Checks
    ↓
Package
    ↓
Docker Image
    ↓
Deployment
    ↓
Smoke Tests
```

---

# 17. Documentation Goals

The project should maintain documentation for:

- Architecture
- Database
- APIs
- Business rules
- Domain boundaries
- Security
- Testing
- Deployment
- Operational procedures

Documentation should evolve with the system rather than being written only at the end.

---

# 18. Engineering Quality Goals

The codebase should follow:

- SOLID principles
- Clean code practices
- Domain-oriented organization
- Consistent naming
- Clear exception handling
- Consistent API contracts
- Meaningful logging
- Automated testing
- Code review practices

Avoid unnecessary abstraction and premature microservices.

---

# 19. Learning & Engineering Objectives

RideX is also intended to demonstrate practical engineering skills expected from a mid-level Java/Spring Boot developer.

The project should provide practical experience with:

### Java

- OOP
- Collections
- Generics
- Streams
- Concurrency
- Exception handling
- JVM fundamentals

### Spring Boot

- REST APIs
- Spring Security
- JPA/Hibernate
- Transactions
- Validation
- Caching
- Events
- Scheduling
- Configuration management

### Databases

- PostgreSQL
- Indexing
- Transactions
- Isolation levels
- Query optimization
- Database constraints
- Migrations

### Distributed Systems

- Redis
- Kafka
- Event-driven architecture
- Idempotency
- Retry
- Failure handling
- Eventual consistency

### Testing

- JUnit
- Mockito
- Testcontainers
- API testing
- Integration testing
- E2E testing
- Performance testing
- Security testing

### DevOps

- Docker
- CI/CD
- Cloud deployment
- Monitoring
- Logging
- Metrics
- Tracing

---

# 20. MVP Success Criteria

The first MVP will be considered functionally complete when the following workflow works end-to-end:

```text
1. Super Admin
       ↓
2. Creates / activates tenant
       ↓
3. Tenant Admin logs in
       ↓
4. Configures tenant
       ↓
5. Adds vehicle
       ↓
6. Adds driver
       ↓
7. Driver becomes online
       ↓
8. Rider registers
       ↓
9. Rider requests ride
       ↓
10. Pricing engine calculates fare
       ↓
11. Dispatch finds driver
       ↓
12. Driver receives offer
       ↓
13. Driver accepts
       ↓
14. Driver arrives
       ↓
15. Trip starts
       ↓
16. Trip completes
       ↓
17. Payment processed
       ↓
18. Receipt generated
       ↓
19. Rider rates ride
       ↓
20. Tenant sees ride in dashboard
```

---

# 21. Out-of-Scope for Initial MVP

The following should not block the first MVP:

- Ride pooling
- AI-based dispatch
- Advanced machine-learning demand prediction
- Loyalty programs
- Complex corporate billing
- Multi-country taxation
- Multi-currency settlement
- Autonomous vehicle support
- Advanced fraud detection
- Full data warehouse
- Complex marketplace integrations

These can be considered future roadmap items.

---

# 22. Goal Traceability

Every major feature should eventually map back to a product goal.

Example:

```text
Problem
   ↓
Goal
   ↓
Requirement
   ↓
Feature
   ↓
Jira Story
   ↓
Implementation
   ↓
Test Case
   ↓
Acceptance Criteria
```

Example:

```text
Problem:
Manual driver assignment

        ↓

Goal:
Automated driver dispatch

        ↓

Requirement:
System shall identify eligible nearby drivers

        ↓

Feature:
Driver Matching

        ↓

Jira:
RIDEX-XXX Implement Driver Matching

        ↓

Tests:
Eligible driver
Unavailable driver
Out-of-radius driver
Wrong vehicle
Concurrent assignment
No available driver
```

This traceability should be maintained throughout the project.

---

# 23. Goal Priority

Goals should be prioritized as follows:

### P0 — Critical

Without these, RideX cannot operate.

```text
Tenant isolation
Authentication
Authorization
Ride lifecycle
Driver dispatch
Data integrity
Payment correctness
```

### P1 — High

Required for a production-oriented MVP.

```text
Fleet management
Pricing
Notifications
Audit logging
Testing
Observability
CI/CD
```

### P2 — Medium

Important but not required for initial MVP.

```text
Advanced analytics
Advanced reporting
Advanced pricing
Additional notification channels
```

### P3 — Future

```text
AI dispatch
Ride pooling
Predictive analytics
Advanced fraud detection
```

---

## Document Metadata

**Document:** Goals & Objectives  
**Version:** 1.0  
**Status:** Draft  
**Owner:** RideX Product Team  
**Last Updated:** 2026-08-10

## Related Documents

- `01-Project-Abstract.md`
- `02-Product-Vision.md`
- `03-Problem-Statement.md`