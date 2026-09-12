# Admin Panel — Open Gaps

What is not finished in `ridex-admin-web`, read off the code on 2026-09-05.

Wired and working: dashboard, riders, drivers and driver detail, approvals (documents and
vehicles), trips list, payments list, payouts, analytics, audit log, settings, shuttle routes,
support cases, pricing.

---

## 1. Detail pages are mock while their list pages are real

**Ops sees:** a real list, clicks a row, and lands on invented data.

- **PaymentDetailPage** — `PAYMENTS` from `src/data/mock`. The list beside it is live. The refund
  button on it refunds nothing.
- **TripDetailPage** — mock trip, mock timeline, mock fare breakdown.
- **RiderDetailPage** — mock rider, mock ride history.

**Missing:** single-record endpoints (`/admin/payments/{id}`, `/admin/trips/{id}`,
`/admin/riders/{id}`) and the pages reading them. `/admin/drivers/{driverId}` already exists and
`DriverDetailPage` uses it — that is the pattern to copy.

**Where:** backend and admin web. This is the one that makes the panel look finished and behave
otherwise.

---

## 2. Live Map is a picture

`LiveMapPage` renders mock positions. Nothing subscribes to driver locations.

**Missing:** the same feed the rider app needs for tracking — driver positions from
`/api/v1/driver/location`, exposed to ops over a topic or a polled endpoint. Ops watching supply
in real time is the panel's most-used screen in a real operation.

**Where:** backend and admin web.

---

## 3. Promotions do not exist

`PromotionsPage` is entirely mock. There is no promotions module in the backend at all — no table,
no service, no endpoint. Discounts today come only from points.

**Missing:** the whole feature — promo codes, eligibility, budget caps, and a discount line the
fare can carry (the fare model already funds discounts from the platform's share, so the money
side is prepared).

**Where:** backend first, then admin web, then a promo field in the rider app.

---

## 4. Feature flags do not exist

`FlagsPage` is mock. Nothing in the backend reads a flag. `platform_settings` is the closest
thing and is a settings table, not a flag system.

**Where:** decide whether this is wanted at all. If yes, the honest cheap version is more rows in
`platform_settings` with a boolean type, not a new subsystem.

---

## 5. Notification templates are not editable

`TemplatesPage` is mock. `NotificationTemplates` is a Java switch — as its own comment says, it
moves to the database when ops needs to edit copy without a deploy, and not before. The page
promises that today and cannot do it.

**Where:** either build the template store, or replace the page with a read-only view of what the
templates say.

---

## 6. Staff and roles are not manageable

`StaffPage` is mock. `user_roles` exists and the API is role-gated, but there is no endpoint to
list staff, invite one, or change a role. Ops cannot add an admin without SQL.

**Where:** backend then admin web.

---

## 7. Shuttle: routes only, no operations view

`ShuttlePage` manages routes, stops, fares and schedules against the real API. What is missing is
the running side:

- Departures for a day, and the manifest of who is booked on each.
- Assigning a driver and vehicle to one date's departure — the endpoint exists
  (`/schedules/{id}/departures/{date}/assign`) and nothing calls it.
- Seat occupancy, and cancellations against a departure.

**Where:** admin web (the endpoints are largely there).

---

## 8. Support cases cannot be replied to from the list

`CasesPage` and `CaseDetailPage` use the real ticket API. Check that resolve and reply are both
wired end to end before calling this done — the backend exposes messages and resolve.

**Where:** admin web, small.

---

## 9. No refunds, no manual adjustments

The payment detail page has a refund control that is mock, and there is no server route for an
ops-initiated refund or a goodwill points adjustment (`ADMIN_ADJUSTMENT` exists as a reason with
no endpoint behind it). Every real operation needs both within a week of launch.

**Where:** backend and admin web.

---

## 10. Cancellation policy and dues are invisible

Cancellation fees are charged against the next fare (`rider_dues`), and nothing in the panel shows
what a rider owes or lets ops waive it. The same for shuttle cancellation credits.

**Where:** backend (a small dues endpoint) and admin web.
