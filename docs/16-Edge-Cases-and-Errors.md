# RideX B2C — Edge Cases and Error Catalog

## Authentication
AUTH-001 Invalid credentials
AUTH-002 Unverified account
AUTH-003 Expired verification token
AUTH-004 Already-used verification token
AUTH-005 Refresh token replay
AUTH-006 Rate limit exceeded

## Ride
RIDE-001 No drivers available
RIDE-002 Driver accepts after timeout
RIDE-003 Two drivers accept concurrently
RIDE-004 Rider cancels during matching
RIDE-005 Driver cancels after acceptance
RIDE-006 Driver loses connectivity
RIDE-007 Rider loses connectivity
RIDE-008 Trip start without valid assignment
RIDE-009 Trip completion before start
RIDE-010 Duplicate completion request

## Payment
PAY-001 Payment provider timeout
PAY-002 Payment failed
PAY-003 Payment succeeded but callback delayed
PAY-004 Duplicate webhook
PAY-005 Unknown provider transaction
PAY-006 Refund failure
PAY-007 Partial refund

## Driver
DRIVER-001 Expired document
DRIVER-002 Suspended driver receives stale offer
DRIVER-003 Vehicle becomes unavailable
DRIVER-004 Driver location stale
DRIVER-005 Driver accepts another ride while unavailable

## General API response model

{
  "success": false,
  "code": "RIDE_NO_DRIVERS_AVAILABLE",
  "message": "No drivers are currently available.",
  "traceId": "..."
}

Do not expose stack traces or internal provider/database errors to clients.
