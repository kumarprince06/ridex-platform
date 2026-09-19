# RideX — Notification Matrix

Every message the platform actually sends, from the templates and the code that enqueues them.

Generated from the code rather than maintained by hand:

```bash
java tools/DocGen.java notifications > docs/12-Notification-Matrix.md
```

Generated on 2026-09-20 from `44d0bb5`.

## How a message gets out

Domain change → a row in `notification_outbox`, written inside the same transaction →
`OutboxDispatcher` drains it every few seconds → channel. Nothing sends inside a
business transaction: a completed signup must not roll back because a mail server was
briefly unreachable, and a message that was never written is one nobody can chase.

`Notifier.notifyUser` does two things at once: the push, and a row in
`user_notifications` so the person can find it again after the push is swiped away.

Push respects `notification_preferences`; email does not. An address is not always an
account - a verification code goes to somebody who has none yet, and must.

## Events

| Event | Channels | In the app's feed | Raised by |
|---|---|---|---|
| `VERIFY_ACCOUNT` | Email | No | `auth/AuthService` |
| `RESET_PASSWORD` | Email | No | `auth/AuthService` |
| `ACCOUNT_EXISTS` | Email | No | `auth/AuthService` |
| `SHUTTLE_DEPARTURE_CANCELLED` | Email + Push | Yes | `shuttle/ShuttleService` |
| `REFUNDED_AS_POINTS` | Email + Push | Yes | `admin/AdminRefundController`, `payment/RefundService` |
| `SHUTTLE_BOOKED` | Email + Push | Yes | `shuttle/ShuttleService` |
| `SHUTTLE_INVOICE` | Email + Push | Yes | `shuttle/ShuttleService` |
| `SHUTTLE_STARTED` | Push | Yes | `shuttle/ShuttleRunService` |
| `SHUTTLE_TWO_STOPS_AWAY` | Push | Yes | `shuttle/ShuttleRunService` |
| `SHUTTLE_ARRIVING` | Push | Yes | `shuttle/ShuttleRunService` |
| `SHUTTLE_BOARDED` | Push | Yes | `shuttle/DriverShuttleService` |
| `WELCOME` | Email | No | `auth/AuthService` |
| `DRIVER_UNDER_REVIEW` | Email + Push | Yes | `driver/DriverOnboardingService` |
| `DRIVER_APPROVED` | Email + Push | Yes | `admin/AdminDriverController`, `driver/DriverOnboardingService` |
| `DRIVER_REJECTED` | Email + Push | Yes | `admin/AdminDriverController`, `driver/DriverOnboardingService` |
| `DRIVER_SUSPENDED` | Email + Push | Yes | `admin/AdminDriverController`, `driver/DriverOnboardingService` |
| `DOCUMENT_APPROVED` | Email + Push | Yes | `admin/AdminDriverController`, `driver/DriverDocumentService` |
| `DOCUMENT_REJECTED` | Email + Push | Yes | `admin/AdminDriverController`, `driver/DriverDocumentService` |
| `RIDE_RECEIPT` | Email + Push | Yes | `trip/TripService` |
| `RIDE_CANCELLED_BY_DRIVER` | Push | Yes | `ride/RideRequestService` |

## Not built

- **SMS.** `SmsChannel` logs and returns. A real provider needs an account, per-message
  billing and - in India - DLT template registration, none of which should be decided by
  whoever wires the interface. Swap the body of `send()`; nothing above it changes.
- **Ops alerts.** Nothing notifies operations. They read the console.
