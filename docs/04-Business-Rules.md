# RideX B2C — Business Rules

## Identity
- One verified login identity maps to one user account.
- Roles are platform roles and/or capabilities, not tenant roles.
- Driver eligibility is independent from rider eligibility.

## Dispatch
- Only approved, online and eligible drivers may receive offers.
- Driver eligibility must consider vehicle type, status, location, service area and other configurable rules.
- A ride must not be accepted by two drivers.
- Assignment must be concurrency-safe.

## Trip
- Trip state transitions are explicit and validated.
- A trip cannot move backwards.
- Start requires an accepted/eligible driver and valid trip conditions.
- Completion requires a started trip.
- Cancellation rules depend on actor and trip stage.

## Payment
- Payment state is independent from trip state.
- A successful payment callback must be idempotent.
- Webhooks must be verified.
- Provider transaction IDs must be unique.
- Refunds and adjustments must never mutate historical transaction meaning; create separate records/events.

## Driver earnings
- Gross rider fare, platform fee, taxes, adjustments and driver net earnings must be distinguishable.
- Payouts must be reconcilable to earning/settlement records.

## Safety
- Emergency/support actions must be auditable.
- Sensitive user data must not appear in normal application logs.
