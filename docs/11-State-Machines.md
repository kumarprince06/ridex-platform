# RideX B2C — State Machines

## Ride request

REQUESTED
→ SEARCHING
→ DRIVER_ASSIGNED
→ DRIVER_ARRIVING
→ DRIVER_AT_PICKUP
→ TRIP_STARTED
→ COMPLETED

Alternative terminal states:
→ CANCELLED_BY_RIDER
→ CANCELLED_BY_DRIVER
→ CANCELLED_BY_SYSTEM
→ EXPIRED

## Driver onboarding

REGISTERED
→ PROFILE_SUBMITTED
→ DOCUMENTS_SUBMITTED
→ UNDER_REVIEW
→ APPROVED

Alternative:
→ REJECTED
→ SUSPENDED

## Payment

CREATED
→ REQUIRES_ACTION
→ PROCESSING
→ SUCCEEDED

Alternative:
→ FAILED
→ CANCELLED
→ REFUNDED
→ PARTIALLY_REFUNDED

## Rules

State transitions must be validated in one application/domain boundary and protected from concurrent duplicate commands.
