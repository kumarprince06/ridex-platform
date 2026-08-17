# RideX B2C — Product Requirements

## Business requirements

BR-001: RideX shall operate as one B2C mobility platform.
BR-002: Riders shall be able to register without invitation.
BR-003: Drivers shall be able to register without invitation, subject to onboarding/KYC.
BR-004: A rider shall be able to request a ride using pickup and destination.
BR-005: The system shall match eligible drivers to ride requests.
BR-006: The platform shall calculate and display pricing before confirmation where the ride type supports upfront pricing.
BR-007: The platform shall track a trip from request through completion.
BR-008: Payments shall be recorded independently from trip state.
BR-009: Driver earnings and platform fees shall be separately auditable.
BR-010: Every important financial state change shall be auditable.

## MVP ride types

- Economy
- Premium
- XL/large vehicle
- Scheduled ride

Keep ride types configurable rather than hard-coded.

## Authentication

- Email and/or phone registration
- Password or OTP strategy can be selected during implementation
- Email/phone verification where required
- Access + refresh token
- Device/session management
- Logout/revocation

## Rider requirements

- Profile
- Saved places
- Ride request
- Fare estimate
- Driver details
- Live trip state
- Cancellation
- Payment
- Rating/review
- Trip history
- Receipts
- Support

## Driver requirements

- Registration
- Identity/KYC
- Vehicle
- Documents
- Approval status
- Availability
- Ride offers
- Navigation
- Trip lifecycle
- Earnings
- Payout history
- Support

## Admin requirements

- Dashboard
- Rider management
- Driver/KYC management
- Vehicle management
- Trip monitoring
- Pricing configuration
- Payment/refund management
- Dispute/support management
- Promotions
- Safety controls
- Audit logs

## Future requirements

- Corporate rides
- Wallet
- Multi-stop trips
- Scheduled recurring rides
- Intercity
- Rentals
- Delivery
- EV charging integration
- Fleet partnerships
