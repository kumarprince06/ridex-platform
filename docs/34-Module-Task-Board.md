# Module Task Board

One module at a time. [26-Build-Task-List.md](26-Build-Task-List.md) was the original build order
and is largely done; this board is **what is left**, grouped so that each entry can be picked up,
finished and closed in one sitting without leaving anything half-wired.

Every module names the same five things, so there is never a question about whether it is done:

- **Why** — what is broken or missing today
- **Scope** — exactly what is in, and what is deliberately out
- **Files** — where the work lands
- **Done when** — the check that closes it
- **Effort** — `S` under a day · `M` a few days · `L` a week or more

Sources: [28-Rider-App-Gaps.md](28-Rider-App-Gaps.md),
[29-Partner-App-Gaps.md](29-Partner-App-Gaps.md),
[30-Admin-Panel-Gaps.md](30-Admin-Panel-Gaps.md),
[31-Deployment-and-CI-CD.md](31-Deployment-and-CI-CD.md).

**Rules:** one module at a time, top to bottom. Do not start the next before the previous one's
"done when" is actually true. Update the status column when a module closes.

---

## Board

| # | Module | Effort | Status |
|---|---|---|---|
| M1 | Trip distance and fare correctness | S | ☐ |
| M2 | Partner app: shuttle duty | L | ☐ |
| M3 | Live ride status and the real driver | M | ☐ |
| M4 | Live location on the map | M | ☐ |
| M5 | Admin detail pages | M | ☐ |
| M6 | Admin shuttle operations | M | ☐ |
| M7 | Support and Report an Issue | M | ☐ |
| M8 | Demo deployment and CI/CD | M | ☐ |
| M9 | Notifications feed | M | ☐ |
| M10 | Driver money: bank details and payouts | M | ☐ |
| M11 | Driver-side trip actions | M | ☐ |
| M12 | Points polish | S | ☐ |
| M13 | Passes: actually charge for them | M | ☐ |
| M14 | Account, settings and security | M | ☐ |
| M15 | Saved places | M | ☐ |
| M16 | Small cleanups | S | ☐ |

---

## M1 — Trip distance and fare correctness · `S`

**Why.** `TripInProgressScreen` calls `completeTrip(tripId, 8200, duration)`. Every completed trip
reports 8.2 km, so **every fare in the system is computed from a constant**. Nothing else on this
board moves money on every single trip.

**Scope.** Accumulate real distance in the partner app between location fixes and send it. Add a
server-side sanity check — a client-supplied distance is a client-supplied fare — comparing the
reported distance against the straight-line pickup-to-drop distance and flagging an implausible
ratio for ops rather than silently accepting it.

**Out.** Map-matched routing. The sanity check is the guard; exact route distance is a later
optimisation.

**Files.** `ridex-partner-app/src/screens/TripInProgressScreen.tsx`,
`ridex-backend/.../trip/TripService.java`.

**Done when.** Two trips of visibly different lengths produce visibly different fares, and a
deliberately absurd distance is rejected or flagged.

---

## M2 — Partner app: shuttle duty · `L`

**Why.** The partner app has **zero** shuttle code. Riders can book seats that no driver app can
board. The backend side is complete and unused: `/api/v1/driver/shuttle/departures`, the manifest
for a departure, and boarding a passenger against their code.

**Scope.** A "My runs" screen (today's departures for this driver), a departure screen with the
manifest — who boards where, who gets off where, seat labels — and check-in by scanning the rider's
QR or typing their code, reusing the existing camera scanner. Boarding a cash seat settles its
payment, which the backend already does.

**Out.** Live tracking of the shuttle (that is M4).

**Files.** New `ridex-partner-app/src/screens/Shuttle*.tsx`, `src/api/shuttle.ts`, navigation.

**Done when.** A seat booked on the rider app can be boarded from the partner app, the manifest
shows the passenger as boarded, and a cash seat's payment moves to `SUCCEEDED`.

---

## M3 — Live ride status and the real driver · `M`

**Why.** The rider's journey advances on `setTimeout` (9s, 12s), not on what the driver did. And
the driver on screen is `DRIVER` from `data/mock.ts` — the same "Marcus Rivera · Toyota Camry" on
every ride. The partner app has the same problem in reverse: it shows a mock rider and mock
addresses from `OFFER`.

**Scope.** Put the driver on `RideResponse` — name, rating, vehicle, plate — exactly like the
shuttle's `crew`. Extend `useRideStatus` polling to the whole journey and drive screen transitions
from the server's status. Delete `DRIVER` and `OFFER` from both mock files and the fallbacks that
read them.

**Out.** Replacing polling with a STOMP client. Polling is honest and nothing above it changes when
the socket lands.

**Files.** `ride/dto/RideResponse.java`, `ride/RideRequestService.java`;
`ridex-rider-app/src/api/rideStatus.ts` and the four driver-* screens;
`ridex-partner-app` trip screens.

**Done when.** Driving the partner app moves the rider app's screens, and both show the same real
name, vehicle and plate.

---

## M4 — Live location on the map · `M`

**Why.** The partner app posts to `/api/v1/driver/location` and nothing ever hands that position to
the rider waiting for that driver, or to ops. `MapCanvas` takes `driverAt` — a number from 0 to 1 —
and interpolates a puck along the route. Also the shuttle tracking asked for: route, stops and a
vehicle marker from 15 minutes before departure.

**Scope.** Store the latest position per driver and expose it to (a) the rider on the ride, (b) the
riders holding a seat on a departure, from 15 minutes before it leaves, (c) the admin live map.
`MapCanvas` takes a coordinate instead of a fraction. Vehicle marker matches the vehicle type.

**Out.** Route replay and trip history playback.

**Files.** `location/DriverPresence.java` plus a new endpoint or STOMP topic; `MapCanvas.tsx` in
the rider app; `LiveMapPage.tsx` in admin.

**Done when.** Moving the partner-app device moves the marker on the rider app and the admin map.

---

## M5 — Admin detail pages · `M`

**Why.** Real lists, mock detail. Click a payment, a trip or a rider in the panel and the page
shows invented data — `PAYMENTS`, `TRIPS`, `RIDERS` from `src/data/mock`. `DriverDetailPage`
already uses a real endpoint; that is the pattern.

**Scope.** `/admin/payments/{id}`, `/admin/trips/{id}`, `/admin/riders/{id}` on the backend, and
the three pages reading them: payment with its events and refund state, trip with its status
timeline and fare lines, rider with their rides, points and dues.

**Out.** Issuing refunds (that is its own module, see below in M-later).

**Files.** `admin/AdminQueryService.java`, `AdminQueryController.java`;
`ridex-admin-web/src/pages/{Payment,Trip,Rider}DetailPage.tsx`, `src/api/admin.ts`.

**Done when.** No page in the admin panel imports from `data/mock` except the ones listed as
deliberately deferred (flags, templates, promotions, staff).

---

## M6 — Admin shuttle operations · `M`

**Why.** `ShuttlePage` manages routes, stops, fares and schedules. It cannot see a single running
departure. The assign endpoint (`/schedules/{id}/departures/{date}/assign`) exists and nothing
calls it.

**Scope.** Departures for a chosen date, occupancy per departure, the manifest, and assigning a
driver and vehicle to one date's departure. Cancelled seats visible.

**Files.** `ridex-admin-web/src/pages/ShuttlePage.tsx` (or a new `ShuttleOpsPage`), `api/admin.ts`.

**Done when.** Ops can look at tomorrow's 08:15, see who is on it, and swap the driver.

---

## M7 — Support and Report an Issue · `M`

**Why.** `/api/v1/support/tickets` is complete and **no app calls it**. In the rider app, Report an
Issue collects a category and a description and then calls `navigation.goBack()` — the rider
believes it was filed and nothing was. That is worse than an obviously unfinished screen.

**Scope.** Both apps: raise a ticket, list my tickets, read the thread, reply. Categories from the
server rather than `data/mock`. FAQs can stay static — they are content, not data.

**Files.** `src/api/support.ts` (new, both apps), `ReportIssueScreen.tsx`, `HelpSupportScreen.tsx`
in both apps; confirm reply and resolve work end to end in `CaseDetailPage.tsx`.

**Done when.** A ticket raised in the rider app appears in the admin panel, and an ops reply
appears back in the app.

---

## M8 — Demo deployment and CI/CD · `M`

**Why.** There is no Dockerfile and no deploy workflow. CI builds and tests only.

**Scope.** As set out in [31](31-Deployment-and-CI-CD.md): backend Dockerfile, a deployment
compose or host config, secrets out of `.env` **and rotated**, a demo profile with test Razorpay
keys, `tsc --noEmit` in CI for all three front-ends, deploy on merge, a keep-warm ping if the host
sleeps, demo seed data plus a reset script, and fixed demo logins.

**Done when.** A link opens the admin panel, an APK installs and talks to it, and a fortnight later
both still work.

---

## M9 — Notifications feed · `M`

**Why.** Both apps show four invented rows. There is no rider-facing or driver-facing notification
endpoint at all — `notification_outbox` is a delivery queue, not a readable history.

**Scope.** A per-user notification record written alongside the outbox send, an endpoint to list
and mark read, and both screens reading it. Push already works and stays as it is.

**Files.** New table and service in `notification/`, `NotificationsScreen.tsx` in both apps.

**Done when.** Booking a seat produces a row on the rider's notifications screen.

---

## M10 — Driver money: bank details and payouts · `M`

**Why.** `BankDetailsScreen` and `PayoutMethodScreen` collect account details and submit nothing.
Payouts are listed from the real endpoint, so a driver can see money owed and cannot say where to
send it.

**Scope.** A payout destination on the driver profile, validated and stored; the two screens
submitting it; the admin payout flow showing where it will go.

**Out.** A payout gateway integration (RazorpayX). Ops settles manually, as today.

**Done when.** A driver can enter their account details, and ops can see them against a pending
payout.

---

## M11 — Driver-side trip actions · `M`

**Why.** A driver cannot cancel a trip (the screen exists, uses mock reasons and calls nothing,
while `CancelledBy.DRIVER` and its cancellation policy rows already exist), and cannot rate a
rider (`ride_ratings` holds both directions).

**Scope.** A driver cancellation endpoint with reason codes — mirroring the rider's, which is
already built — and a driver rating endpoint. Both screens wired. Trips list and trip details from
a real driver-facing endpoint instead of `TRIPS` mock. Ratings screen from real data.

**Done when.** A driver cancellation ends the rider's ride with a stated reason, and both parties'
ratings land in `ride_ratings`.

---

## M12 — Points polish · `S`

**Why.** Two small honesty problems. The fare estimate's Total does not change when the points
toggle is switched on, so the discount is invisible until after the trip. And cancelling a ride
does not return the points spent on it — `RideRequestService` says a cancellation refunds them as
a new entry, and nothing does.

**Scope.** Show the discounted total on the estimate and on the shuttle seat screen (the seat map
response needs the fare on it). Credit the points back on ride cancellation.

**Done when.** Toggling points changes the number the rider is about to agree to, and cancelling
returns them.

---

## M13 — Passes: actually charge for them · `M`

**Why.** `PassService.buy` writes a pass row with `pricePaidMinor` and creates no payment. Passes
are free today.

**Scope.** Route the purchase through the same payment path as a seat — cash or Razorpay, points
redeemable against it (the redeem service is already generic on the subject). Show passes in the
rider app: buy, see remaining rides, see expiry.

**Done when.** Buying a pass takes money, and the pass covers seats until its rides run out.

---

## M14 — Account, settings and security · `M`

**Why.** Every toggle in both apps' settings is `useState` and forgets itself. Privacy & Security is
entirely decorative: dead toggles, "Last changed 3 months ago" hardcoded, "2 devices logged in"
hardcoded, and five rows that do nothing.

**Scope.** Persist preferences (locally, and notification preferences on the server since the
server decides whether to push). Change password. A sessions list from `refresh_tokens` with
revoke. Login history from `auth_events`. Account deletion — which needs a policy decision first:
what happens to rides, invoices and outstanding dues. Rider app: profile photo upload, since
`profileImageKey` already exists on the profile.

**Out.** Two-factor and biometric. Remove those toggles rather than leave them lying.

**Done when.** Nothing on either screen claims something that is not true.

---

## M15 — Saved places · `M`

**Why.** The screen is an honest empty state because there is nowhere to save to. No table, no
endpoint.

**Scope.** Saved places on the backend, home/work/favourites in the app, and offering them in the
destination search.

**Done when.** A place saved once is offered on the next booking.

---

## M16 — Small cleanups · `S`

Collected so they do not each become a module:

- Ride tiers from the server (`ride_types`) instead of `RIDE_TIERS` in `data/mock`, in both the
  rider app's Choose Ride and Fare Estimate.
- Forgot / New Password screens actually calling `api/auth.ts`, which already exports
  `resetPassword`.
- Drive screen's "today's earnings" from the real endpoint, like the Earnings screen next to it.
- Partner app Account screen from the real profile and vehicle endpoints.
- Remove the last `data/mock` imports once the modules above have emptied them.

---

## Deliberately deferred

Not on the board. Listed so they are a decision, not an oversight:

| Item | Why not now |
|---|---|
| Promotions | No backend module at all. Real feature, needs its own design. [32](32-Business-Readiness-and-New-Lines.md) |
| Feature flags | `platform_settings` with a boolean type covers it if it is ever needed |
| Notification templates in the database | The switch is fine until ops needs to edit copy without a deploy |
| Staff and role management | Ops adds admins by SQL today; acceptable for a demo |
| Refunds and manual adjustments | Needs the wallet first ([32](32-Business-Readiness-and-New-Lines.md), 2.1) |
| Wallet, GST invoicing, corporate accounts, delivery | Business lines, not gaps. [32](32-Business-Readiness-and-New-Lines.md) |
| Real surge | A stored constant today. Either compute it or drop the column |
| SOS and safety | Belongs with the wallet-tier work; the mock button should be removed until then |
