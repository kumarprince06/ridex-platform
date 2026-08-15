# RideX Phase-Based Delivery Plan

This document tracks the project in milestone phases so the team can complete the product step by step without mixing too many concerns in one task.

## Core rule
Each phase is a single complete task with one clear outcome. No hidden subtasks inside a phase. A phase is considered done only when the feature is working end-to-end in a realistic way.

---

## Phase 1: Core Platform Foundation

### Goal
Build the shared backend foundation for all apps and user roles.

### Deliverables
- Central auth system
- JWT access token + refresh token
- User identity model
- Tenant model
- Tenant-user role mapping
- Tenant onboarding foundation
- Security configuration
- API base structure

### Acceptance Criteria
- A user can register and login
- A tenant can be created from the admin flow
- Users can be linked to a tenant with roles
- The backend supports multi-tenant separation by tenant context

### Status
Planned

---

## Phase 2: Tenant Onboarding and Admin Setup

### Goal
Enable a tenant business to onboard and set up its team.

### Deliverables
- Company registration flow
- Tenant onboarding form
- Business profile setup
- Admin user assignment
- Invite flow for team members
- User activation inside tenant

### Acceptance Criteria
- A new tenant can complete onboarding
- The first user becomes tenant admin
- Additional users can be created or invited into the tenant
- The tenant is ready for subscription and activation

### Status
Planned

---

## Phase 3: Subscription and Payment Foundation

### Goal
Make the platform monetizable and tenant-ready for production usage while supporting the full financial lifecycle of a mobility business.

### Deliverables
- Subscription plan model
- Tenant subscription records
- Generic payment provider abstraction for multiple gateways
- Public and secret key configuration per tenant and payment use case
- Platform subscription payment flow for RideX super admin billing
- Ride fare payment flow for tenant-specific trip billing
- Driver payout / settlement flow for tenant-to-driver payments
- Payment transaction storage and reconciliation
- Payment intent / checkout flow
- Payment status and webhook handling
- Subscription activation logic
- Invoice generation for platform subscription billing
- Invoice generation for ride fare billing
- Invoice or settlement record generation for driver payouts
- Invoice status tracking and document storage
- Audit trail for all financial records

### Acceptance Criteria
- Tenant can select and pay for a platform plan
- Payment can be captured through a generic provider interface regardless of gateway
- Successful platform payment is saved with provider metadata and status
- Ride payment can be captured for a trip or booking in a tenant-specific flow
- Driver settlement payout is tracked separately from platform subscription billing
- Invoice is generated for each successful billable event: subscription, ride, and payout settlement
- Failed payment is tracked and handled cleanly
- Tenant billing and platform revenue can be audited from payment + invoice records
- Driver payouts can be reconciled from trip payment and settlement records

### Status
In Progress

---

## Phase 4: Super Admin Panel

### Goal
Create a platform-level administration panel for the operator.

### Deliverables
- Dashboard overview
- Tenant management
- User management
- Subscription status overview
- Billing and payment reports
- Platform performance analytics
- Support and moderation tools
- Branding and system config controls

### Acceptance Criteria
- Super admin can see all tenants and their states
- Super admin can review users, payments, and subscriptions
- Platform-level controls are available from one dashboard

### Status
Planned

---

## Phase 5: Tenant Admin Panel

### Goal
Build the business dashboard for each tenant operator.

### Deliverables
- Tenant dashboard
- Driver management
- Rider or customer management
- Fleet management
- Trip and booking overview
- Team member management
- Reports and usage analytics
- Tenant branding and configuration

### Acceptance Criteria
- A tenant admin can manage their users and operations
- Tenant admin sees all tenant-level activity in one panel
- The panel supports business operations for the mobility platform

### Status
Planned

---

## Phase 6: Rider App Flow

### Goal
Deliver the rider-facing mobility experience.

### Deliverables
- Rider login and profile
- Booking or trip request flow
- Trip status tracking
- Ride history
- Payment status inside rider flow
- Push notifications
- Customer support access

### Acceptance Criteria
- Rider can sign in and request a ride
- Rider can track trip status
- Rider can view trip history and payment activity

### Status
Planned

---

## Phase 7: Driver App Flow

### Goal
Deliver the driver-focused operational experience.

### Deliverables
- Driver login and profile
- Availability state
- Trip assignment / pickup flow
- Navigation and trip status updates
- Earning and payout overview
- Dispatch and support flow
- Notifications and alerts

### Acceptance Criteria
- Driver can log in and go online
- Driver can receive trips or assignments
- Driver can update trip status and complete work
- Driver can see earnings and trip history

### Status
Planned

---

## Phase 8: Generic Notification System

### Goal
Add a reusable communication layer across all apps and tenants.

### Deliverables
- Email notifications
- SMS notifications
- Push notifications
- WhatsApp integration option
- Notification templates
- Event-driven notification service
- Tenant-specific channel configuration

### Acceptance Criteria
- Notifications are raised from domain events
- Channels are abstracted behind a provider interface
- Tenants can configure the channels they want to use

### Status
Planned

---

## Phase 9: Branding, QA, Deployment, and Launch Readiness

### Goal
Prepare the product for production release and launch.

### Deliverables
- Branding for all panels and apps
- UX polish and consistency
- Backend QA and regression checks
- Mobile QA and app validation
- Environment deployment setup
- Security review
- Launch checklist and release readiness

### Acceptance Criteria
- All major flows work end-to-end
- Branding is consistent across all product surfaces
- The product is launch-ready by the target date

### Status
Planned

---

## Recommended Delivery Timeline

### Option A: Practical schedule to 25 December
- Phase 1: Week 1–2
- Phase 2: Week 3–4
- Phase 3: Week 5–6
- Phase 4: Week 7–8
- Phase 5: Week 9–10
- Phase 6: Week 11–12
- Phase 7: Week 12–13
- Phase 8: Week 13–14
- Phase 9: Week 14

This is a realistic roadmap for a full product launch with backend, dashboards, and apps.

---

## Important implementation rule
The team should not work on multiple phases at once without finishing the previous phase.

The correct sequence is:

1. Core backend
2. Tenant onboarding
3. Subscriptions and payments
4. Invoicing and billing docs
5. Super admin
6. Tenant admin
7. Rider app
8. Driver app
8. Notifications
9. Launch polish

This ensures no hidden gaps and keeps the product buildable milestone by milestone.

---

## Final product vision

The final product should be one platform with multiple surfaces:
- one super admin panel
- one tenant admin panel
- one rider app
- one driver app
- one shared backend
- one generic payment system
- one generic notification system
- one multi-tenant SaaS architecture

This is the right structure for a RideX-style mobility platform.
