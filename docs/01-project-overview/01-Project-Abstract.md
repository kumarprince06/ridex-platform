# RideX — Multi-Tenant Ride-Hailing & Fleet Management SaaS Platform

## 1. Project Abstract

RideX is a multi-tenant Software-as-a-Service (SaaS) platform designed to provide transportation companies, fleet operators, and mobility service providers with a complete digital platform for managing their ride-hailing and transportation operations.

The platform enables multiple independent organizations, referred to as tenants, to operate their businesses through a shared application infrastructure while maintaining strict logical isolation of their business data.

Each tenant can independently manage riders, drivers, vehicles, service areas, pricing rules, rides, payments, staff, notifications, and operational settings according to its subscription plan and configuration.

The platform provides separate experiences for different user types, including platform administrators, tenant administrators, dispatchers, drivers, and riders.

The core ride lifecycle includes ride booking, fare estimation, driver discovery, driver matching, ride acceptance, driver arrival, trip initiation, trip completion, cancellation, payment processing, and post-ride rating.

RideX will also provide a real-time dispatch system capable of identifying eligible nearby drivers and assigning ride requests based on configurable business and dispatch rules.

The backend will be developed using Java and Spring Boot following a modular domain-oriented architecture. PostgreSQL will be used as the primary relational database using a shared-database, shared-schema multi-tenant model with tenant-level data isolation. Redis will be used for caching, temporary state, and real-time driver location management, while Kafka will be introduced for asynchronous event processing and inter-domain communication.

The system will include authentication, role-based access control, tenant isolation, subscription management, payment processing, notification management, audit logging, observability, automated testing, CI/CD, containerization, and cloud deployment.

The project is intended to demonstrate production-oriented software engineering practices rather than functioning only as a basic CRUD application. It will cover requirements analysis, domain modeling, database design, API development, distributed system concepts, security, automated testing, performance considerations, deployment, monitoring, and operational reliability.

## 2. Project Type

**Multi-Tenant SaaS Platform**

## 3. Primary Domain

**Ride-Hailing, Fleet Management & Transportation**

## 4. Target Users

- Platform Super Administrators
- Tenant Administrators
- Dispatchers
- Finance/Operations Staff
- Drivers
- Riders

## 5. Primary Technology Stack

### Backend

- Java
- Spring Boot
- Spring Security
- Spring Data JPA
- Hibernate
- Flyway

### Database & Storage

- PostgreSQL
- Redis
- Object Storage

### Messaging

- Apache Kafka

### Testing

- JUnit
- Mockito
- Testcontainers
- REST API testing
- Playwright
- Performance testing tools

### DevOps

- Docker
- CI/CD
- Cloud infrastructure
- Centralized logging
- Metrics
- Distributed tracing

## 6. Architectural Approach

The initial implementation will use a modular monolith architecture with clearly defined domain boundaries.

The major domains will include:

- Identity & Access Management
- Tenant Management
- Subscription & SaaS Billing
- Fleet Management
- Rider Management
- Ride Management
- Dispatch & Driver Matching
- Pricing
- Payment
- Notification
- Audit & Reporting

The architecture will be designed so that selected domains can later be extracted into independent services if scaling or operational requirements justify a microservice architecture.

## 7. Multi-Tenancy Strategy

RideX will initially use:

**Shared Database + Shared Schema + `tenant_id`**

Tenant-owned records will contain a `tenant_id` that identifies the organization responsible for the data.

Tenant isolation will be enforced at the application layer and will be strengthened with database-level controls such as PostgreSQL Row-Level Security where appropriate.

## 8. Expected Outcome

The final system should provide a production-oriented demonstration of how a scalable multi-tenant ride-hailing SaaS platform can be designed, developed, tested, deployed, monitored, and maintained using modern Java and Spring Boot technologies.