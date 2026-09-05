# Rider App — Open Gaps

What is not finished in `ridex-rider-app`, checked against the code on 2026-09-05 rather than
against the plan. Each entry says what a rider sees today, what is actually missing, and whether
the work is in the app, the backend, or both.

Ordered by what hurts a real rider first.

---

## 1. The live ride runs on timers, not on the driver

**Rider sees:** the ride walks itself forward — driver approaching, arrived, trip started,
completed — whether or not a driver did anything.

**Actually:** `DriverApproachingScreen`, `DriverArrivedScreen` and `TripInProgressScreen` each hold
a `setTimeout` that replaces the screen after a fixed delay (9s, 12s). The server's real transitions
are ignored. `useRideStatus` polls every 3s but is only used on the "finding a driver" screen.

**Missing:** app follows ride status through the whole journey, not just the search. The backend
already pushes over STOMP (`/topic/rides/{id}`); polling would do until a socket client exists.

**Where:** rider app.

---

## 2. The driver on screen is invented

**Rider sees:** "Marcus Rivera · Toyota Camry 2022 · RX · 4821" on every assigned ride, whoever is
actually driving.

**Actually:** `DRIVER` in `src/data/mock.ts`, used by `DriverAssignedScreen`,
`DriverApproachingScreen` and `TripInProgressScreen`.

**Missing:** `RideResponse` carries no driver at all. The shuttle already solved this — a booked
seat returns a `crew` object with name, rating, vehicle and plate. A ride needs the same.

**Where:** backend (add the driver to the ride response), then app.

---

## 3. No live driver position on the map

**Rider sees:** a car puck sitting at a fixed fraction along the route line.

**Actually:** `MapCanvas` takes `driverAt` — a number from 0 to 1 — and interpolates. Nothing
reads a real coordinate.

**Missing:** the partner app already posts to `/api/v1/driver/location`, but nothing hands that
position to the rider who is waiting for that driver. Needs a rider-facing endpoint or a STOMP
topic, then a coordinate-driven marker.

**Where:** backend and app. Same work as shuttle live tracking.

---

## 4. Report an Issue goes nowhere

**Rider sees:** a category list, a description box, and a Submit button that closes the screen as
if the report was filed.

**Actually:** `ReportIssueScreen` calls `navigation.goBack()` and nothing else. Categories come
from `ISSUE_CATEGORIES` in `src/data/mock.ts`.

**Missing:** nothing on the backend — `/api/v1/support/tickets` already creates tickets, lists
them and takes replies, and ops can see them. The app simply never calls it.

**Why it matters most of the mock screens:** the others look unfinished; this one lies.

**Where:** rider app only.

---

## 5. Help & Support has no support in it

**Rider sees:** a fixed FAQ list and no way to reach a person.

**Actually:** `FAQS` from `src/data/mock.ts`.

**Missing:** the ticket list and thread view for `/api/v1/support/tickets` — raising a ticket,
reading replies, replying back.

**Where:** rider app (backend is ready).

---

## 6. Notifications are four invented rows

**Rider sees:** the same four notifications forever.

**Actually:** `NOTIFICATIONS` from `src/data/mock.ts`.

**Missing:** there is no rider-facing notification endpoint at all. `notification_outbox` is an
internal delivery queue, not a per-rider feed, and push tokens are stored but nothing keeps a
readable history.

**Where:** backend first (a notifications feed), then app.

---

## 7. App Settings forget everything

**Rider sees:** toggles for dark mode, language, background location, data saver, ride updates and
promotions.

**Actually:** all `useState` in `SettingsScreen`. Closing the app resets every one.

**Missing:** at minimum local persistence; notification preferences belong on the server, because
the server is what decides whether to send a push.

**Where:** app, plus a small backend preference store for the notification toggles.

---

## 8. Privacy & Security is entirely decorative

**Rider sees:** Two-Factor and Biometric toggles, "Last changed 3 months ago", "2 devices logged
in", and rows for Change Password, Trusted Devices, Login History, Your Data and Delete Account.

**Actually:** two `useState` toggles; every row is inert; both subtitles are hardcoded strings.

**Missing:** change password (the backend has reset, not change), a device/session list, a login
history view, a data export and an account deletion path. `auth_events` and `refresh_tokens`
already hold the data for the history and device list.

**Where:** backend and app. Account deletion also needs a policy decision — what happens to rides,
payments and outstanding dues.

---

## 9. Saved Places has nowhere to save to

**Rider sees:** an honest empty state.

**Missing:** there is no saved-places table or endpoint in the backend. Home/Work/favourites need
building from scratch, then wiring into the destination search.

**Where:** backend first, then app.

---

## 10. Points: two real problems

Redemption itself works end to end — the rider toggles "Use N points" on the fare estimate, the
server spends what it can (`PointsService.redeem`), records the discount on the ride, and the
settlement subtracts it while still paying the driver commission on the gross fare.

**10a. Redeeming more points than the fare burns the difference.**
`redeem` spends `min(requested, balance)` rounded down to whole rupees, with no reference to the
fare. The app sends the rider's *entire* balance whenever the toggle is on. Settlement then caps
the discount at the fare (`min(discountMinor, gross)`), so a rider with 6800 points (₹68) taking a
₹40 ride pays nothing — and loses all 6800 points for ₹40 of value. The fare has to cap the spend
at redemption time, not at settlement.

**10b. The estimate total does not change when points are applied.**
The toggle switches on and the Total underneath stays exactly the same, so the discount only
becomes visible after the trip. It should re-render against the redeemable value.

**10c. Shuttle seats cannot be paid for with points.**
Which is pointed, because the credit for a *cancelled shuttle seat* is paid in points and cannot
be spent on another shuttle seat.

**Where:** 10a and 10c backend, 10b app.

---

## 11. Ride tiers are hardcoded

**Rider sees:** a fixed list of tiers on Choose Ride and Fare Estimate.

**Actually:** `RIDE_TIERS` in `src/data/mock.ts`, matched to server prices by code.

**Missing:** the backend has a `ride_types` table; the app should read the list, its names, seat
counts and icons from the estimate response rather than keeping a parallel copy that can drift.

**Where:** app, and a small addition to the estimate response.

---

## 12. Forgot / New Password screens never call the API

`ForgotPasswordScreen` and `NewPasswordScreen` import no API module, while `api/auth.ts` already
exports `resetPassword`. The reset flow is walkable on screen and does nothing.

**Where:** rider app.

---

## 13. Smaller ones

- **Profile photo** — `profileImageKey` exists on the backend profile; the app shows initials only
  and offers no upload.
- **Rewards** — no way to see more than the most recent entries; no paging.
- **Trip receipt** — the receipt endpoint is wired, but there is no share or download.
- **CheckInbox** — has a button that stands in for tapping the emailed verification link.

---

## Not gaps (checked, and working)

- Rewards balance, entry history, referral code and applying a referral.
- Rating a driver after a trip.
- Shuttle: routes, departures, seat map, booking, Razorpay or cash, the ticket with QR and OTP,
  cancellation with points credit, invoice mail with a PDF.
- Ride cancellation with a reason code and a fee carried onto the next fare.
- Push registration and the device token endpoint.
- Profile read and edit.
