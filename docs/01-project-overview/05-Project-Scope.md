# RideX — Project Scope

## 1. Purpose

This document defines the functional and technical boundaries of the RideX project.

The scope establishes:

- What will be included in the initial MVP
- What will be implemented after the MVP
- What is intentionally excluded
- Which user roles are supported
- Which platforms are included
- Which integrations are required
- Which technical capabilities are part of the project

The scope will be used as a reference when evaluating new feature requests.

---

# 2. Product Scope

RideX will be developed as a multi-tenant SaaS platform for transportation and ride-hailing businesses.

The initial platform will support:

```text
Super Admin
Tenant Admin
Dispatcher
Driver
Rider
```

The system will provide capabilities for:

- Tenant onboarding
- Subscription management
- User authentication
- Role-based authorization
- Fleet management
- Rider management
- Ride management
- Driver dispatch
- Pricing
- Payments
- Notifications
- Reporting
- Audit logging

---

# 3. MVP Scope

The MVP represents the minimum complete business workflow required for RideX to operate as a functional ride-hailing SaaS platform.

The MVP must support the following complete flow:

```text
Tenant Registration
       ↓
Tenant Activation
       ↓
Tenant Configuration
       ↓
Driver Registration
       ↓
Vehicle Registration
       ↓
Rider Registration
       ↓
Ride Booking
       ↓
Fare Calculation
       ↓
Driver Dispatch
       ↓
Driver Acceptance
       ↓
Driver Arrival
       ↓
Trip Start
       ↓
Trip Completion
       ↓
Payment
       ↓
Receipt
       ↓
Rating
```

---

# 4. Tenant Management Scope

## Included

The MVP will support:

- Tenant registration
- Tenant activation
- Tenant suspension
- Tenant status management
- Tenant profile
- Tenant settings
- Tenant feature configuration
- Tenant service areas
- Tenant-level data isolation

Tenant lifecycle:

```text
REGISTERED
    ↓
TRIAL
    ↓
ACTIVE
    ↓
PAST_DUE
    ↓
SUSPENDED
    ↓
CANCELLED
```

Not every transition will necessarily be available directly from every state.

---

# 5. Subscription Management Scope

## Included

The SaaS platform will support:

- Subscription plans
- Tenant subscription
- Trial period
- Subscription activation
- Subscription cancellation
- Subscription status
- Past-due handling
- Feature restrictions
- SaaS invoices

The system will distinguish between:

```text
SaaS Subscription
```

and:

```text
Ride Payment
```

SaaS subscription:

```text
Tenant → RideX
```

Ride payment:

```text
Rider → Tenant
```

---

# 6. Identity & Access Management Scope

## Included

The MVP will support:

- User registration
- Login
- Logout/session invalidation
- JWT authentication
- Refresh tokens
- Password reset
- Email verification
- Role-based access control
- Permission-based authorization
- Account activation/deactivation
- Basic account lockout

Initial roles:

```text
SUPER_ADMIN
TENANT_ADMIN
DISPATCHER
FINANCE
DRIVER
RIDER
```

---

# 7. Fleet Management Scope

## Included

Tenant administrators will be able to manage:

### Drivers

- Driver registration
- Driver profile
- Driver status
- Driver documents
- Driver verification
- Driver suspension
- Driver availability

### Vehicles

- Vehicle registration
- Vehicle profile
- Vehicle type
- Vehicle documents
- Vehicle verification
- Vehicle status

### Driver-Vehicle Assignment

The system will support:

- Assigning a vehicle to a driver
- Removing an assignment
- Tracking assignment history
- Validating assignment eligibility

---

# 8. Rider Management Scope

## Included

Riders will be able to:

- Register
- Login
- Manage profile
- Manage phone/email
- Save addresses
- View ride history
- Manage payment methods
- View receipts
- Rate completed rides

---

# 9. Ride Management Scope

## Included

The ride system will support:

### Ride Creation

- Pickup location
- Destination
- Vehicle type
- Fare estimate
- Ride request

### Ride Lifecycle

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

### Additional States

The system will support appropriate failure and cancellation states such as:

```text
CANCELLED
EXPIRED
NO_DRIVER_AVAILABLE
```

### Ride Operations

- Create ride
- View ride
- Cancel ride
- Accept ride
- Reject ride
- Driver arrival
- Start ride
- Complete ride
- Ride history
- Ride rating
- Ride receipt

---

# 10. Dispatch Scope

## Included

The initial dispatch system will support:

- Driver location updates
- Nearby driver discovery
- Driver eligibility filtering
- Vehicle type filtering
- Driver availability filtering
- Service-area filtering
- Driver ranking
- Ride offer creation
- Offer expiration
- Driver rejection
- Dispatch retry
- Driver reassignment
- Manual dispatcher assignment

---

# 11. Driver Matching Scope

The initial driver ranking algorithm may consider:

```text
Distance
+
Availability
+
Vehicle compatibility
+
Driver status
+
Current workload
+
Tenant configuration
```

The algorithm will initially use deterministic rule-based scoring.

Machine-learning-based driver prediction is outside the MVP scope.

---

# 12. Pricing Scope

## Included

The pricing engine will support:

- Base fare
- Distance-based pricing
- Time-based pricing
- Minimum fare
- Surge pricing
- Cancellation fees
- Discounts
- Taxes
- Fare breakdown
- Pricing rule activation/deactivation
- Pricing rule versioning

Historical fare calculations must remain reproducible.

---

# 13. Payment Scope

## Included

The payment module will support:

- Payment creation
- Payment authorization
- Payment capture
- Payment failure
- Payment retry
- Payment status
- Payment transaction history
- Payment webhooks
- Full refunds
- Partial refunds
- Payment idempotency
- Basic reconciliation

A payment provider will be integrated through an abstraction layer so that the core domain does not become tightly coupled to one provider.

---

# 14. Notification Scope

## MVP Channels

The initial notification system will support:

- Push notifications
- Email
- In-app notifications

SMS may be implemented as an additional provider depending on development priorities.

### Notification Events

Examples include:

```text
Tenant activated
User registered
Ride requested
Driver assigned
Driver accepted
Driver arrived
Ride started
Ride completed
Ride cancelled
Payment completed
Payment failed
```

---

# 15. Admin Portal Scope

## 15.1 Super Admin

The Super Admin portal will provide:

- Dashboard
- Tenant management
- Tenant activation/suspension
- Subscription management
- Platform configuration
- Platform users
- Audit logs
- Basic platform analytics

---

## 15.2 Tenant Admin

The Tenant Admin portal will provide:

- Dashboard
- Driver management
- Vehicle management
- Rider management
- Ride management
- Dispatch monitoring
- Pricing configuration
- Payment information
- Staff management
- Tenant settings
- Reports

---

## 15.3 Dispatcher

The dispatcher interface will provide:

- Active ride monitoring
- Driver availability
- Driver location
- Manual assignment
- Ride intervention
- Dispatch status

---

# 16. Driver Application Scope

The initial driver application will support:

- Login
- Profile
- Online/offline status
- Ride offers
- Accept/reject ride
- Pickup navigation information
- Driver arrival
- Start trip
- Complete trip
- Ride history
- Earnings summary
- Notifications

---

# 17. Rider Application Scope

The initial rider application will support:

- Registration
- Login
- Profile
- Pickup selection
- Destination selection
- Fare estimate
- Ride request
- Driver tracking
- Ride status
- Ride cancellation
- Payment
- Ride history
- Receipts
- Rating

---

# 18. Reporting Scope

The MVP will provide basic operational reports.

### Tenant Reports

- Total rides
- Completed rides
- Cancelled rides
- Revenue
- Active drivers
- Driver acceptance rate
- Driver completion rate
- Average fare
- Average ride duration

### Platform Reports

- Total tenants
- Active tenants
- Subscription status
- Total rides
- Platform revenue
- Tenant activity

Advanced business intelligence is outside the initial MVP.

---

# 19. Audit Scope

The platform will maintain audit records for important administrative and business operations.

Examples:

```text
Tenant created
Tenant suspended
User role changed
Driver suspended
Vehicle updated
Pricing rule changed
Payment refunded
Ride manually assigned
```

Audit records should contain sufficient information to determine:

- Who performed the action
- Which tenant was affected
- What resource was modified
- When it happened
- What changed

---

# 20. Security Scope

The MVP will include:

- JWT authentication
- Role-based access control
- Permission validation
- Tenant isolation
- Password hashing
- Input validation
- API authorization
- Rate limiting for sensitive endpoints
- Audit logging
- Secure configuration management
- Basic security headers

Security testing will include:

- Authentication bypass attempts
- Authorization bypass attempts
- Cross-tenant access attempts
- Invalid token handling
- Expired token handling
- Injection testing
- Rate-limit validation

---

# 21. Technical Scope

## Backend

The primary backend will use:

```text
Java
Spring Boot
Spring Security
Spring Data JPA
Hibernate
Flyway
```

---

## Database

Primary transactional database:

```text
PostgreSQL
```

Initial tenancy strategy:

```text
Shared Database
+
Shared Schema
+
tenant_id
```

---

## Caching and Real-Time State

```text
Redis
```

Redis will initially be used for:

- Driver location
- Nearby-driver lookup
- Caching
- Temporary state
- Distributed locks where required

---

## Messaging

```text
Apache Kafka
```

Kafka will be used for asynchronous events where asynchronous processing provides clear value.

Examples:

```text
RideCompleted
PaymentCompleted
DriverAssigned
NotificationRequested
```

Kafka should not be introduced into every request simply for architectural complexity.

---

# 22. API Scope

The backend will expose REST APIs for:

```text
Authentication
Tenants
Users
Drivers
Vehicles
Riders
Rides
Dispatch
Pricing
Payments
Notifications
Reports
```

API standards will include:

- Versioning
- Consistent HTTP status codes
- Standard error responses
- Validation
- Pagination
- Filtering
- Sorting
- Correlation IDs
- Authentication
- Authorization

---

# 23. Testing Scope

The project will include multiple levels of testing.

### Unit

- Domain logic
- Services
- Validators
- Pricing
- Dispatch

### Integration

- PostgreSQL
- Redis
- Kafka
- Security
- Repositories

### API

- Authentication
- Authorization
- CRUD
- Business workflows
- Error scenarios

### End-to-End

Critical business workflows will be tested from beginning to end.

### Performance

The system will be tested for:

- API load
- Concurrent rides
- Dispatch load
- Location updates
- Database performance

### Security

Security testing will focus particularly on tenant isolation and authorization.

---

# 24. DevOps Scope

The project will include:

- Git-based source control
- Docker
- Local development environment
- CI pipeline
- Automated tests
- Static analysis
- Docker image creation
- Staging deployment
- Production deployment
- Environment configuration
- Database migrations
- Logging
- Metrics
- Health checks
- Monitoring
- Alerting

---

# 25. Observability Scope

The platform will provide:

### Logging

Structured application logs containing relevant identifiers such as:

```text
timestamp
request_id
tenant_id
user_id
operation
status
duration
```

### Metrics

Examples:

```text
API latency
API error rate
Ride creation rate
Dispatch success rate
Payment success rate
Active drivers
Kafka consumer lag
Database connection usage
Redis health
```

### Tracing

Distributed tracing will be introduced for important cross-component workflows.

---

# 26. Explicitly Out of Scope — MVP

The following features will not be required to complete the MVP.

## Advanced Ride Features

- Ride pooling
- Shared rides
- Complex multi-stop routing
- Scheduled recurring rides
- Intercity ride management

## Advanced Business Features

- Corporate accounts
- Corporate billing
- Loyalty programs
- Referral programs
- Driver incentive programs
- Advanced wallet system

## Advanced Intelligence

- Machine-learning dispatch
- Predictive demand forecasting
- Dynamic AI pricing
- AI fraud detection

## Advanced Analytics

- Data warehouse
- Data lake
- Machine-learning analytics
- Advanced BI dashboards

## Advanced Globalization

- Multi-country taxation
- Complex international settlements
- Multi-region active-active deployment
- Extensive multi-currency accounting

---

# 27. Future Scope

Features that may be considered after MVP include:

```text
Scheduled rides
Ride pooling
Corporate accounts
Wallets
Loyalty
Driver incentives
Advanced surge pricing
AI dispatch
Demand forecasting
Fraud detection
Advanced analytics
Data warehouse
Multi-region deployment
External fleet integrations
Third-party transportation integrations
```

These features must not be added to the MVP unless a formal scope change is approved.

---

# 28. Platform Boundaries

RideX will be responsible for:

```text
Tenant Management
Identity
Fleet
Riders
Rides
Dispatch
Pricing
Payments
Notifications
Reporting
Audit
```

External systems may be responsible for:

```text
Payment processing
Maps and routing
Push delivery
Email delivery
SMS delivery
Cloud storage
```

RideX will integrate with these systems through clearly defined interfaces.

---

# 29. Scope Change Policy

Any feature not explicitly included in the MVP scope should be treated as a scope change.

A proposed scope change should be evaluated based on:

1. Business value
2. Engineering effort
3. Security impact
4. Architectural impact
5. Testing effort
6. Delivery timeline
7. Dependencies
8. Effect on existing functionality

A feature should only enter the MVP if it provides sufficient value to justify the additional complexity and delivery impact.

---

# 30. MVP Definition of Success

The MVP is considered successful when:

1. A Super Admin can create and manage a tenant.
2. A tenant can configure its organization.
3. A tenant can create drivers and vehicles.
4. A rider can register.
5. A rider can request a ride.
6. The pricing engine calculates a fare.
7. The dispatch engine finds eligible drivers.
8. A driver can accept a ride.
9. The driver can complete the trip.
10. The payment can be processed.
11. The rider can receive a receipt.
12. The rider can rate the ride.
13. The tenant can view the completed ride.
14. Tenant data remains isolated.
15. Critical workflows are covered by automated tests.
16. The application can be deployed through an automated CI/CD pipeline.

---

# 31. Scope Summary

```text
                    RIDEX MVP
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    PLATFORM        OPERATIONS      RIDES
        │              │              │
    Tenants          Fleet          Booking
    Auth             Drivers        Dispatch
    Billing          Vehicles       Pricing
    RBAC             Riders         Payment
                     Staff          Rating
        │              │              │
        └──────────────┼──────────────┘
                       │
              SECURITY & AUDIT
                       │
                 OBSERVABILITY
                       │
                    TESTING
                       │
                    CI / CD
```

---

## Document Metadata

**Document:** Project Scope  
**Version:** 1.0  
**Status:** Draft  
**Owner:** RideX Product Team  
**Last Updated:** 2026-08-10

## Related Documents

- `01-Project-Abstract.md`
- `02-Product-Vision.md`
- `03-Problem-Statement.md`
- `04-Goals-and-Objectives.md`