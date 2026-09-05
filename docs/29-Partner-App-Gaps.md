# Partner App — Open Gaps

What is not finished in `ridex-partner-app`, read off the code on 2026-09-05. Same shape as
`28-Rider-App-Gaps.md`: what a driver sees, what is actually missing, and where the work is.

The dispatch spine is real — offers arrive over the socket, accept/reject, arrive at pickup, start
against the rider's code, complete the trip. Onboarding, documents, vehicles, earnings and payouts
are wired too. What follows is what is not.

---

## 1. The completed trip reports a made-up distance

**Driver sees:** a trip that completes and pays.

**Actually:** `TripInProgressScreen` calls `completeTrip(tripId, 8200, durationSeconds)` — 8.2 km,
hardcoded, on every trip. The backend prices the fare from what it is told, so **every fare is
computed from a constant**.

**Missing:** the distance actually covered. The app already has location permission and reports
position while on duty; the trip screen needs to accumulate distance between fixes (or ask the
server, which is receiving them).

**Where:** partner app, and worth a server-side sanity check — a client-supplied distance is a
client-supplied fare.

**Why it is first:** it is the only gap here that moves money on every single trip.

---

## 2. The trip screens show a mock rider and a mock address

**Driver sees:** "Sarah Chen · 4.9" and the same pickup and drop-off text on every job.

**Actually:** `OFFER` from `src/data/mock.ts`, used by `RideOfferScreen`, `NavigateToPickupScreen`,
`ArrivedAtPickupScreen`, `TripInProgressScreen`, `SafetyScreen` and `RateRiderScreen`. The real
offer payload is fetched and used for ids and the accept call, but the labels on screen come from
the mock — `RideOfferScreen` even falls back to it: `offer.pickupAddress ?? OFFER.pickup`.

**Missing:** rider name and rating on the trip payload, and the screens reading addresses from it
rather than from the fallback.

**Where:** backend (rider identity on the driver's trip view) and app.

---

## 3. No shuttle at all

**Driver sees:** nothing. There is no shuttle screen in the partner app.

**Actually:** zero references to shuttle anywhere in `src/`.

**Missing:** the backend has the whole driver side ready — `/api/v1/driver/shuttle/departures`,
the manifest for one departure, and boarding a passenger against their code. A driver assigned to
the 08:15 cannot see their run, their passenger list, or check anybody in.

**Where:** partner app only. This is the largest missing surface in the product: riders can book
seats that no driver app can board.

---

## 4. Trips list and trip details are invented

**Driver sees:** a fixed history of trips.

**Actually:** `TRIPS` from `src/data/mock.ts` in `TripsScreen` and `TripDetailsScreen`.

**Missing:** a driver-facing trip history endpoint. Earnings already lists per-trip lines, so the
data exists; it needs an endpoint shaped as a trip list.

**Where:** backend then app.

---

## 5. Today's earnings on the Drive screen are mock

`DriveScreen` imports `EARNINGS` from the mock file for the on-duty summary, while
`EarningsScreen` and `PayoutsScreen` next to it use the real endpoint. The number the driver sees
most often is the fake one.

**Where:** partner app.

---

## 6. Ratings screen is decorative

`RatingsScreen` reads `DRIVER` from the mock — rating, count and the tag breakdown are invented.
The backend keeps `rating` and `rating_count` on the driver profile and `ride_ratings` rows behind
them.

**Where:** backend (expose the breakdown) then app.

---

## 7. Cancel Trip does not cancel

`CancelTripScreen` uses `CANCEL_REASONS` from the mock and never calls the server. A driver who
cancels leaves the ride live for the rider.

**Missing:** a driver cancellation endpoint (the rider has one; `CancelledBy.DRIVER` exists in the
domain and in the cancellation policy table, with no route to it).

**Where:** backend and app.

---

## 8. Rate the rider goes nowhere

`RateRiderScreen` collects stars and tags and calls nothing. `ride_ratings` holds both directions.

**Where:** backend (a driver-side rating endpoint) then app.

---

## 9. Account, notifications, help, settings, safety

- **AccountScreen** — driver name and vehicle from the mock, while `api/profile.ts` and
  `api/vehicles.ts` both exist.
- **NotificationsScreen** — four invented rows; no feed endpoint exists (same gap as the rider app).
- **HelpSupportScreen** — static FAQs; `/api/v1/support/tickets` is ready and unused.
- **SettingsScreen** — every toggle is `useState`; nothing persists.
- **SafetyScreen** — the SOS action is a mock offer and no call. An emergency button that does
  nothing is worse than no button.

**Where:** mostly app; notifications and SOS need backend first.

---

## 10. Payout method and bank details do not save

`BankDetailsScreen` and `PayoutMethodScreen` collect account details and never submit them.
Payouts are listed from the real endpoint, so a driver can see money owed and cannot say where to
send it.

**Where:** backend (payout destination on the driver) then app.

---

## Not gaps (checked, and working)

- Signup, OTP verification, password reset entry points, onboarding status gates
  (under review / approved / rejected / suspended screens).
- Document upload and its review states; vehicle registration.
- Going on and off duty, location reporting while on duty.
- Live offers over the socket, accept, reject, expiry.
- Arrive at pickup; starting a trip against the rider's code, including the QR scanner.
- Completing a trip (except the distance it reports — gap 1).
- Earnings summary and lines; payout history.
