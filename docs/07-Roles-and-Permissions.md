# RideX B2C — Roles and Permissions

## Rider
Can:
- manage own profile
- request/cancel own rides
- view own trips
- manage own payment methods
- view own receipts
- rate completed trips
- create support cases

## Driver
Can:
- manage own driver profile
- manage submitted documents
- manage own vehicle information
- change availability
- receive eligible offers
- update assigned trip states
- view own earnings/payouts
- create support cases

## Support Agent
Can:
- search permitted users/trips
- view support-relevant information
- create/update cases
- perform approved operational adjustments

Cannot:
- change platform security settings
- arbitrarily alter financial history

## Operations Admin
Can:
- manage drivers
- manage riders
- monitor trips
- configure operational rules
- manage disputes/refunds subject to policy

## Super Admin
Full platform administration with strong audit requirements.

Use permission-based authorization internally even if roles are the initial UI representation.
