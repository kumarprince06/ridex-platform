# RideX

### Multi-Tenant SaaS Ride-Hailing & Fleet Management Platform

RideX is a production-grade, multi-tenant SaaS platform for ride-hailing and fleet management, built with Java and Spring Boot.

The platform is designed to simulate a real-world enterprise system with tenant isolation, rider and driver management, intelligent dispatching, real-time ride tracking, dynamic pricing, payments, notifications, role-based access control, event-driven architecture, observability, automated testing, and scalable cloud deployment.

---

## 🚀 Project Status

**Status:** 🚧 Active Development

**Current Phase:** Platform Foundation

**Architecture:** Multi-Tenant SaaS

**Backend:** Java + Spring Boot

**Database:** PostgreSQL

**Cache:** Redis

**Messaging:** Apache Kafka

**Migration:** Flyway

**Containerization:** Docker

---

## 🎯 Project Goals

The primary goals of RideX are:

- Build a production-grade SaaS architecture
- Implement proper multi-tenancy and tenant isolation
- Design scalable backend services using Spring Boot
- Implement real-world ride-hailing business workflows
- Build a reliable driver dispatch system
- Handle concurrency and distributed transactions
- Implement secure authentication and authorization
- Practice event-driven architecture
- Implement comprehensive automated testing
- Build production-ready observability and monitoring
- Deploy the platform using modern DevOps practices

---

## 🏢 Multi-Tenant Architecture

RideX follows a **shared database + shared schema + tenant_id** strategy.

Each tenant's business data is logically isolated using `tenant_id`.

```text
                    ┌─────────────────────┐
                    │     Super Admin     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Tenant Platform   │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
        Tenant A           Tenant B           Tenant C
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │   Shared Schema     │
                    │     tenant_id       │
                    └─────────────────────┘
```

The architecture is intentionally designed so that a future **database-per-tenant** model can be introduced for enterprise customers.

---

## 🧩 Core Modules

### Identity & Access

- User management
- Authentication
- JWT
- Refresh tokens
- Role-based access control
- Permission management
- Tenant membership
- Account recovery
- Audit logging

### Tenant Management

- Tenant registration
- Tenant onboarding
- Tenant configuration
- Tenant branding
- Subscription plans
- Feature entitlements
- Usage limits
- Tenant suspension

### Rider

- Rider registration
- Rider profiles
- Saved locations
- Ride booking
- Ride cancellation
- Ride history
- Receipts
- Ratings and feedback

### Driver & Fleet

- Driver onboarding
- Driver verification
- Driver documents
- Vehicle management
- Vehicle assignment
- Driver availability
- Driver earnings
- Fleet maintenance

### Dispatch

- Driver eligibility
- Driver matching
- Dispatch offers
- Offer timeout
- Concurrent acceptance handling
- Auto-dispatch
- Manual dispatch
- Scheduled ride dispatch
- Dispatch audit trail

### Ride Lifecycle

```text
REQUESTED
    ↓
SEARCHING_DRIVER
    ↓
DRIVER_ASSIGNED
    ↓
DRIVER_ARRIVING
    ↓
DRIVER_ARRIVED
    ↓
TRIP_STARTED
    ↓
TRIP_COMPLETED
    ↓
FARE_FINALIZED
    ↓
PAYMENT_COMPLETED
```

The system also handles:

- Rider cancellation
- Driver cancellation
- No-show
- Payment failure
- Dispatch failure
- Trip incidents

### Pricing

- Base fare
- Distance-based pricing
- Time-based pricing
- Waiting charges
- Minimum fare
- Tolls
- Surcharges
- Pricing zones
- Dynamic/surge pricing

### Payments

- Payment methods
- Payment authorization
- Payment capture
- Refunds
- Payment webhooks
- Idempotency
- Transaction ledger
- Reconciliation
- Driver settlements

### Notifications

- Push notifications
- Email
- SMS
- Notification preferences
- Templates
- Retry mechanism
- Dead-letter handling

### Admin Panels

#### Super Admin

- Tenant management
- Subscription management
- Global users
- System health
- Audit logs
- Platform analytics

#### Tenant Admin

- Users
- Roles & permissions
- Drivers
- Vehicles
- Pricing
- Configuration
- Reports

#### Dispatcher

- Live ride board
- Driver availability
- Driver locations
- Manual dispatch
- Ride monitoring

---

## 🏗️ High-Level Architecture

```text
                     Clients
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       Rider App    Driver App    Admin Web
          │             │             │
          └─────────────┼─────────────┘
                        │
                        ▼
                API / Security Layer
                        │
                        ▼
                Spring Boot Backend
                        │
       ┌────────────────┼────────────────┐
       │                │                │
       ▼                ▼                ▼
   PostgreSQL         Redis            Kafka
       │                │                │
       │                │                ▼
       │                │          Event Consumers
       │                │
       └────────────────┴────────────────┐
                                        │
                                        ▼
                              External Integrations
                         Maps / Payments / Notifications
```

---

## 🛠️ Technology Stack

### Backend

- Java 21
- Spring Boot 3.x
- Spring Web
- Spring Security
- Spring Data JPA
- Hibernate
- Bean Validation
- Flyway
- OpenAPI / Swagger

### Data & Infrastructure

- PostgreSQL
- Redis
- Apache Kafka
- Docker
- Docker Compose

### Testing

- JUnit 5
- Mockito
- Spring Boot Test
- Testcontainers
- REST API testing
- Contract testing
- Integration testing
- End-to-end testing
- Load testing
- Concurrency testing
- Security testing

### DevOps & Observability

- Git
- CI/CD
- Docker
- Metrics
- Structured logging
- Distributed tracing
- Health checks
- Monitoring
- Alerting

---

## 📁 Repository Structure

```text
ridex-platform/
│
├── backend/
│   └── Spring Boot application
│
├── frontend/
│   └── Admin/Tenant web application
│
├── rider-app/
│   └── Rider mobile application
│
├── driver-app/
│   └── Driver mobile application
│
├── docs/
│   ├── architecture/
│   ├── requirements/
│   ├── database/
│   ├── api/
│   ├── business-rules/
│   └── adr/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   └── scripts/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## 🗄️ Database

The primary database is PostgreSQL.

Core domains include:

```text
Tenant
User
Role
Permission
Subscription
Rider
Driver
Vehicle
Ride
RideEvent
Location
PricingRule
Payment
PaymentTransaction
Refund
Notification
AuditLog
```

All tenant-owned records must maintain tenant isolation through `tenant_id`.

Database changes are managed using **Flyway migrations**.

---

## 🔐 Security Principles

RideX follows these security principles:

- JWT-based authentication
- Role-based authorization
- Tenant isolation
- Input validation
- API rate limiting
- Idempotency
- Secure password handling
- PII protection
- Audit logging
- Security headers
- Secrets management
- OWASP-oriented security testing

Security is treated as a cross-cutting concern rather than a final development phase.

---

## 🧪 Testing Strategy

The project follows a test pyramid:

```text
              E2E Tests
                 ▲
                 │
          Integration Tests
                 ▲
                 │
            API Tests
                 ▲
                 │
            Unit Tests
```

Additional testing includes:

- Multi-tenant isolation tests
- RBAC tests
- Concurrency tests
- Dispatch race-condition tests
- Payment idempotency tests
- Kafka failure tests
- Redis failure tests
- Load testing
- Security testing

---

## 📋 Development Workflow

Development follows a Jira-style workflow:

```text
Backlog
   ↓
To Do
   ↓
In Progress
   ↓
Code Review
   ↓
Testing
   ↓
Ready for QA
   ↓
Done
```

Each feature should have:

1. Requirement
2. Business rules
3. Acceptance criteria
4. Implementation
5. Unit tests
6. Integration tests
7. Code review
8. Documentation
9. QA validation

---

## 🌿 Git Workflow

Recommended branch naming:

```text
main
develop

feature/RIDEX-020-tenant-domain
feature/RIDEX-021-jwt-authentication
feature/RIDEX-052-auto-dispatch

bugfix/RIDEX-051-duplicate-offer
hotfix/RIDEX-xxx-production-issue
```

### Commit Convention

```text
feat:     New functionality
fix:      Bug fix
refactor: Code restructuring
test:     Tests
docs:     Documentation
build:    Build/dependency changes
chore:    Maintenance
perf:     Performance improvements
security: Security changes
ci:       CI/CD changes
```

Example:

```bash
git commit -m "feat(tenant): implement tenant domain [RIDEX-020]"
```

---

## 🚦 Getting Started

### Prerequisites

Install:

- Java 21
- Maven
- Docker
- Docker Compose
- Git
- PostgreSQL client (optional)

### Clone Repository

```bash
git clone <repository-url>
cd ridex-platform
```

### Start Infrastructure

```bash
docker compose up -d
```

### Verify Services

```bash
docker compose ps
```

### Run Backend

```bash
cd backend
./mvnw spring-boot:run
```

---

## 📚 Documentation

Detailed project documentation is maintained under:

```text
docs/
├── architecture/
├── requirements/
├── database/
├── api/
├── business-rules/
└── adr/
```

Important documents include:

- System Architecture
- Database Architecture
- ERD
- Domain Boundaries
- Use Cases
- Business Rules
- Functional Requirements
- Non-Functional Requirements
- Acceptance Criteria
- Edge Cases
- Error Catalog
- Notification Matrix
- Feature Dependency Matrix
- API Documentation
- Architecture Decision Records

---

## 🗺️ Roadmap

### Phase 1 — Foundation

- Project architecture
- Database
- Tenant management
- Authentication
- Authorization
- Core documentation

### Phase 2 — Ride Platform

- Rider
- Driver
- Fleet
- Ride lifecycle
- Dispatch
- Location

### Phase 3 — Business Platform

- Pricing
- Payments
- Notifications
- Subscriptions
- Admin panels

### Phase 4 — Production Engineering

- Kafka
- Redis
- Observability
- Security
- Automated testing
- CI/CD
- Production deployment

### Phase 5 — Future Enhancements

- Database-per-tenant
- Kubernetes
- Multi-region deployment
- ML-based dynamic pricing
- Demand forecasting
- Fraud detection
- Ride pooling
- Corporate accounts
- B2B APIs
- EV fleet management
- IoT/telematics
- Data warehouse
- Real-time control tower

---

## 📊 Project Tracking

The complete implementation roadmap is maintained in Jira.

Every Jira task should map to:

```text
Jira Task
    ↓
Git Branch
    ↓
Commit
    ↓
Pull Request
    ↓
Code Review
    ↓
Tests
    ↓
Deployment
    ↓
Done
```

---

## 📜 License

This project is currently intended for educational, portfolio, and engineering practice purposes.