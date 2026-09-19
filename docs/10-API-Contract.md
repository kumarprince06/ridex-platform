# RideX — API Contract

Every endpoint the backend serves: **146** across 29 controllers.

Generated from the code rather than maintained by hand:

```bash
java tools/DocGen.java api > docs/10-API-Contract.md
```

Generated on 2026-09-19 from `df39c38`.

## Conventions

- **Auth.** A bearer access token (JWT, fifteen minutes) on every route below except the
  public ones. Refresh tokens are opaque, stored hashed, and rotate on use.
- **Roles.** Taken from the token, never from the path or the body. The *Who* column is
  what the route's `@PreAuthorize` actually enforces.
- **Errors.** RFC 7807 `application/problem+json`, with an `errors` map on validation
  failures - one shape everywhere, so one client-side handler covers the platform.
- **Money.** Always minor units next to an ISO currency. The client never sends a price.
- **Idempotency.** Payment intents carry an idempotency key: a retry on a bad network
  must not become a second charge.

## AdminDriver

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/admin/drivers/awaiting-review` | OPS_ADMIN, SUPER_ADMIN | Awaiting review |
| POST | `/api/v1/admin/drivers/{driverId}/approve` | OPS_ADMIN, SUPER_ADMIN | Approve |
| POST | `/api/v1/admin/drivers/{driverId}/reject` | OPS_ADMIN, SUPER_ADMIN | Reject |
| POST | `/api/v1/admin/drivers/{driverId}/suspend` | OPS_ADMIN, SUPER_ADMIN | Suspend |
| GET | `/api/v1/admin/drivers/documents/awaiting-review` | OPS_ADMIN, SUPER_ADMIN | Documents awaiting review |
| GET | `/api/v1/admin/drivers/{driverId}/documents` | OPS_ADMIN, SUPER_ADMIN | Documents |
| GET | `/api/v1/admin/drivers/documents/{documentId}/file` | OPS_ADMIN, SUPER_ADMIN | The file itself, streamed through the application |
| POST | `/api/v1/admin/drivers/documents/{documentId}/approve` | OPS_ADMIN, SUPER_ADMIN | Approve document |
| POST | `/api/v1/admin/drivers/documents/{documentId}/reject` | OPS_ADMIN, SUPER_ADMIN | Reject document |
| GET | `/api/v1/admin/drivers/{driverId}/vehicles` | OPS_ADMIN, SUPER_ADMIN | Vehicles |
| POST | `/api/v1/admin/drivers/vehicles/{vehicleId}/approve` | OPS_ADMIN, SUPER_ADMIN | Approve vehicle |
| POST | `/api/v1/admin/drivers/vehicles/{vehicleId}/reject` | OPS_ADMIN, SUPER_ADMIN | Reject vehicle |

## AdminLegal

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/admin/legal` | OPS_ADMIN, SUPER_ADMIN | Every document with its current text, for the console editor |
| PUT | `/api/v1/admin/legal/{slug}` | OPS_ADMIN, SUPER_ADMIN | Replaces a document's title and text; live on the next open in the apps |

## AdminPayout

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/admin/payouts` | FINANCE, SUPER_ADMIN | List |
| POST | `/api/v1/admin/payouts/run` | FINANCE, SUPER_ADMIN | One payout per driver with money owed |
| POST | `/api/v1/admin/payouts/{payoutId}/send` | FINANCE, SUPER_ADMIN | Send |
| POST | `/api/v1/admin/payouts/{payoutId}/settle` | FINANCE, SUPER_ADMIN | Settle |
| POST | `/api/v1/admin/payouts/{payoutId}/fail` | FINANCE, SUPER_ADMIN | Fail |

## AdminQuery

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/admin/dashboard` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Dashboard |
| GET | `/api/v1/admin/analytics` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Analytics |
| GET | `/api/v1/admin/riders` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Riders |
| GET | `/api/v1/admin/drivers` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Drivers |
| GET | `/api/v1/admin/drivers/live` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | The live map: who is on duty, where, and whether they are carrying somebody |
| GET | `/api/v1/admin/drivers/{driverId}` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Driver |
| GET | `/api/v1/admin/payments/{paymentId}` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Payment |
| GET | `/api/v1/admin/trips/{rideId}` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Trip |
| GET | `/api/v1/admin/riders/{riderId}` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Rider |
| GET | `/api/v1/admin/trips` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Trips |
| GET | `/api/v1/admin/payments` | OPS_ADMIN, SUPER_ADMIN | Payments |
| GET | `/api/v1/admin/audit` | SUPER_ADMIN | Audit log |

## AdminSettings

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/admin/settings` | OPS_ADMIN, SUPER_ADMIN | All |
| PUT | `/api/v1/admin/settings/{key}` | OPS_ADMIN, SUPER_ADMIN | Update |

## AdminShuttle

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/admin/shuttle/routes` | OPS_ADMIN, SUPER_ADMIN | Routes |
| GET | `/api/v1/admin/shuttle/routes/{routeId}` | OPS_ADMIN, SUPER_ADMIN | Route |
| POST | `/api/v1/admin/shuttle/routes` | OPS_ADMIN, SUPER_ADMIN | Create |
| PUT | `/api/v1/admin/shuttle/routes/{routeId}` | OPS_ADMIN, SUPER_ADMIN | Update |
| POST | `/api/v1/admin/shuttle/routes/{routeId}/stops` | OPS_ADMIN, SUPER_ADMIN | Add stop |
| DELETE | `/api/v1/admin/shuttle/routes/{routeId}/stops/last` | OPS_ADMIN, SUPER_ADMIN | Only the last one |
| PUT | `/api/v1/admin/shuttle/routes/{routeId}/fares` | OPS_ADMIN, SUPER_ADMIN | Set fare |
| PUT | `/api/v1/admin/shuttle/routes/{routeId}/fares/matrix` | OPS_ADMIN, SUPER_ADMIN | The whole table in one save |
| DELETE | `/api/v1/admin/shuttle/routes/{routeId}/fares/{fareId}` | OPS_ADMIN, SUPER_ADMIN | Remove fare |
| POST | `/api/v1/admin/shuttle/routes/{routeId}/schedules` | OPS_ADMIN, SUPER_ADMIN | Add schedule |
| PUT | `/api/v1/admin/shuttle/routes/{routeId}/schedules/{scheduleId}` | OPS_ADMIN, SUPER_ADMIN | Update schedule |
| POST | `/api/v1/admin/shuttle/routes/schedules/{scheduleId}/departures/{serviceDate}/assign` | OPS_ADMIN, SUPER_ADMIN | Who is driving one dated departure |

## AdminShuttleOps

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/admin/shuttle/departures` | OPS_ADMIN, SUPER_ADMIN | Departures |
| GET | `/api/v1/admin/shuttle/departures/{shuttleTripId}` | OPS_ADMIN, SUPER_ADMIN | Departure |

## AdminSupport

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/admin/support/tickets` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Queue |
| GET | `/api/v1/admin/support/tickets/{ticketId}` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Get |
| POST | `/api/v1/admin/support/tickets/{ticketId}/messages` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Reply |
| POST | `/api/v1/admin/support/tickets/{ticketId}/resolve` | SUPPORT, OPS_ADMIN, SUPER_ADMIN | Resolve |

## Auth

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/v1/auth/register` | public | 202 rather than 201: the account exists but is unusable until the email is verified, so the work this request started is not finished when the response is written |
| POST | `/api/v1/auth/login` | public | Login |
| POST | `/api/v1/auth/refresh` | public | Refresh |
| POST | `/api/v1/auth/logout` | public | Authenticated, unlike the other auth routes: revoking a session means proving you own it |
| POST | `/api/v1/auth/verify` | public | Verify |
| POST | `/api/v1/auth/forgot-password` | public | Forgot password |
| POST | `/api/v1/auth/reset-password` | public | Reset password |
| POST | `/api/v1/auth/change-password` | public | Changing a password from inside the app |
| GET | `/api/v1/auth/login-history` | public | This account's own login history - what happened, from where, and when |
| GET | `/api/v1/auth/sessions` | public | Sessions |
| DELETE | `/api/v1/auth/sessions/{sessionId}` | public | Revoke session |

## DriverDispatch

| Method | Path | Who | What |
|---|---|---|---|
| PUT | `/api/v1/driver/duty` | DRIVER | Set duty |
| POST | `/api/v1/driver/location` | DRIVER | Report location |
| GET | `/api/v1/driver/offers` | DRIVER | What the app asks for on reconnect |
| POST | `/api/v1/driver/offers/{offerId}/accept` | DRIVER | Accept |
| POST | `/api/v1/driver/offers/{offerId}/reject` | DRIVER | Reject |

## Driver

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/driver/profile` | DRIVER | Get profile |
| GET | `/api/v1/driver/onboarding` | DRIVER | Onboarding |
| POST | `/api/v1/driver/onboarding/submit` | DRIVER | Submit for review |
| GET | `/api/v1/driver/ratings` | DRIVER | The stars riders have given this driver, with whatever they wrote |
| GET | `/api/v1/driver/cancellation-reasons` | DRIVER | The reasons a driver may give, from the server, so the app cannot invent one |
| GET | `/api/v1/driver/rides/{rideId}/cancellation-quote` | DRIVER | What cancelling now would cost for this reason, shown before the driver swipes |
| POST | `/api/v1/driver/rides/{rideId}/cancel` | DRIVER | Cancel ride |
| POST | `/api/v1/driver/rides/{rideId}/rate-rider` | DRIVER | What the rider was like to carry |
| GET | `/api/v1/driver/payout-account` | DRIVER | Payout account |
| PUT | `/api/v1/driver/payout-account` | DRIVER | Set payout account |
| PUT | `/api/v1/driver/profile` | DRIVER | Update profile |

## DriverDocument

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/driver/documents` | DRIVER | Mine |
| POST | `/api/v1/driver/documents` | DRIVER | Multipart, because the file is the point |

## Legal

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/legal/{slug}` | public | One document by its slug: partner-terms, rider-terms or privacy-policy |

## Maps

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/maps/geocode` | public | Geocode |
| GET | `/api/v1/maps/search` | public | Candidates for a partial query, for a picker rather than a lookup |
| GET | `/api/v1/maps/reverse` | public | The address at a point the rider pinned on the map |
| GET | `/api/v1/maps/route` | public | Route |

## Notification

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/notifications` | public | Mine |
| GET | `/api/v1/notifications/unread-count` | public | Unread |
| GET | `/api/v1/notifications/preferences` | public | Preferences |
| PUT | `/api/v1/notifications/preferences` | public | Update preferences |
| POST | `/api/v1/notifications/read` | public | Mark read |

## DeviceToken

| Method | Path | Who | What |
|---|---|---|---|
| PUT | `/api/v1/devices` | authenticated | Registers this device against the signed-in account |
| DELETE | `/api/v1/devices/{token}` | authenticated | Called on sign-out |

## DriverEarnings

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/driver/earnings` | DRIVER | Earnings |
| GET | `/api/v1/driver/earnings/payouts` | DRIVER | What has actually been paid out, against what the earnings above say is owed |

## PaymentWebhook

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/v1/payments/webhook` | authenticated | @param payload the raw body |

## SavedPlace

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/rider/places` | RIDER | Mine |
| POST | `/api/v1/rider/places` | RIDER | Save |
| DELETE | `/api/v1/rider/places/{placeId}` | RIDER | Delete |

## Points

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/points` | public | Balance |
| POST | `/api/v1/points/referral` | public | Apply referral |

## RideEstimate

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/v1/rides/estimate` | RIDER | Estimate |

## Ride

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/v1/rides` | RIDER | Create |
| GET | `/api/v1/rides` | RIDER | List |
| GET | `/api/v1/rides/{rideId}` | RIDER | Get |
| GET | `/api/v1/rides/{rideId}/payment` | RIDER | What is owed on a finished ride, and how to pay it |
| GET | `/api/v1/rides/cancellation-reasons` | RIDER | The cancel screen's reason list, so the app never invents a code the server refuses |
| GET | `/api/v1/rides/dues` | RIDER | What an earlier cancellation left owing, added to the next fare |
| POST | `/api/v1/rides/{rideId}/payment/confirm` | RIDER | Called after checkout closes |
| POST | `/api/v1/rides/{rideId}/rating` | RIDER | One rating per ride, and only after it completed |
| GET | `/api/v1/rides/{rideId}/cancellation-quote` | RIDER | Cancellation quote |
| GET | `/api/v1/rides/{rideId}/receipt` | RIDER | The rider's receipt: what was quoted against what was charged, line for line |
| POST | `/api/v1/rides/{rideId}/cancel` | RIDER | Cancel |

## Rider

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/rider/profile` | RIDER | Get profile |
| PUT | `/api/v1/rider/profile` | RIDER | Update profile |

## DriverShuttle

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/driver/shuttle/departures` | DRIVER | What this driver is running, with each departure's manifest already on it |
| GET | `/api/v1/driver/shuttle/departures/{shuttleTripId}/manifest` | DRIVER | Manifest |
| POST | `/api/v1/driver/shuttle/departures/{shuttleTripId}/bookings/{bookingId}/board` | DRIVER | Checks one passenger in |

## Shuttle

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/shuttle/routes` | RIDER | Routes |
| GET | `/api/v1/shuttle/routes/{routeId}/departures` | RIDER | Departures |
| GET | `/api/v1/shuttle/departures/{scheduleId}/seats` | RIDER | The seat picker |
| POST | `/api/v1/shuttle/bookings/{bookingId}/payment/confirm` | RIDER | Called after checkout closes |
| GET | `/api/v1/shuttle/bookings` | RIDER | The rider's own seats |
| POST | `/api/v1/shuttle/bookings` | RIDER | Book |
| POST | `/api/v1/shuttle/bookings/{bookingId}/cancel` | RIDER | Cancel |
| GET | `/api/v1/shuttle/passes/products` | RIDER | Products |
| POST | `/api/v1/shuttle/passes` | RIDER | Buy pass |
| POST | `/api/v1/shuttle/passes/{passId}/payment/confirm` | RIDER | Confirms the gateway payment, which is what makes the pass usable |
| GET | `/api/v1/shuttle/passes` | RIDER | My passes |

## Support

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/v1/support/tickets` | public | Raise |
| GET | `/api/v1/support/tickets/categories` | public | What this person may raise a ticket about, in their own words, from one place |
| GET | `/api/v1/support/tickets` | public | Mine |
| GET | `/api/v1/support/tickets/{ticketId}` | public | Get |
| POST | `/api/v1/support/tickets/{ticketId}/messages` | public | Reply |

## Trip

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/trips` | DRIVER | This driver's own trips, newest first |
| GET | `/api/v1/trips/current` | DRIVER | The unfinished trip, or 204 when the driver has none |
| GET | `/api/v1/trips/{tripId}` | DRIVER | Everything the trip screens show: who the rider is, where they are going, what it costs |
| POST | `/api/v1/trips/{tripId}/arrive` | DRIVER | Arrive |
| POST | `/api/v1/trips/{tripId}/start` | DRIVER | Start |
| POST | `/api/v1/trips/{tripId}/complete` | DRIVER | Complete |

## Vehicle

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/driver/vehicles` | DRIVER | Mine |
| POST | `/api/v1/driver/vehicles` | DRIVER | Added as PENDING_REVIEW. Operations decides whether it may carry passengers |
| POST | `/api/v1/driver/vehicles/{vehicleId}/deactivate` | DRIVER | Deactivate |
| POST | `/api/v1/driver/vehicles/{vehicleId}/reactivate` | DRIVER | Puts a car the driver took off the road back on it, without a second review |

## DriverWallet

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/v1/driver/wallet` | DRIVER | The balance, the limit below which offers stop, and what clearing it would take |
| POST | `/api/v1/driver/wallet/top-ups` | DRIVER | Opens checkout for everything owed |
| POST | `/api/v1/driver/wallet/top-ups/{topUpId}/confirm` | DRIVER | Called after checkout closes; the gateway is asked whether the money arrived |

