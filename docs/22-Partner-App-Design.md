# RideX Partner App — Design

The driver-facing app, called **RideX Partner**. Same design system as the rider app, different
centre of gravity.

Scope here is the design: what the screens are, what each one is for, which state machine it
serves, and what it borrows from `ridex-rider-app`. It is not an implementation plan — the
backend it needs is T7..T13 in [21-Gap-Tasks.md](21-Gap-Tasks.md).

---

## The one idea

**The rider app sells a ride. The partner app sells a shift.**

A rider opens the app knowing where they want to go, uses it for ten minutes, and closes it.
A driver leaves it open for eight hours. That single difference decides the whole design:

| | Rider app | Partner app |
|---|---|---|
| Session | Minutes, intent-driven | Hours, ambient |
| Home screen answers | "Where am I going?" | "Am I earning, and how much?" |
| Primary control | Destination search | Online/offline toggle |
| Map is | The picker | The workplace |
| Interaction while moving | None — the rider is a passenger | Constant — the driver is driving |
| Money shown as | A price to accept | A total to grow |

Consequence: **every in-trip control is one thumb, one tap, glanceable at 60 km/h.** Buttons on
driving screens are full-width and at least 56pt tall, live text is 30pt+, and no driving screen
asks for typed input. That constraint does not apply to the rider app and is the main reason the
partner app is not a recolour of it.

---

## Design system — inherited, not forked

`ridex-rider-app/src/theme.ts` is copied verbatim. Same near-black `#0B0F1A` ground, same mint
`#2EE7C7`, same Outfit type scale, same radii. A buyer opening both apps side by side must see one
product, not two vendors.

Four tokens are added, because duty status and document review have no rider equivalent:

| Token | Value | Used for |
|---|---|---|
| `online` | `#2EE7C7` (alias of `primary`) | On-duty state. Mint already reads as "live" |
| `offline` | `#5A6478` (alias of `textFaint`) | Off-duty state. Deliberately dull — off duty should look off |
| `warning` | `#D9A05B` (existing `amber`) | Under review, expiring document, low acceptance rate |
| `success` | `#3DDC97` | Trip completed, payout settled. Distinct from mint so "earned" ≠ "live" |

Nothing else changes. A partner screen that hardcodes a hex has drifted from the design — fix the
token, not the screen.

### What moves across as-is

`Button` · `TextField` · `Screen` · `Sheet` · `Row` · `Chip` · `Avatar` · `Stars` · `StatTiles` ·
`SectionLabel` · `StepProgress` · `ToggleRow` · `RouteStops` · `MapCanvas`

Fourteen components, unchanged. `StepProgress` carries driver onboarding, `RouteStops` carries the
pickup→dropoff pair on the offer card, `StatTiles` carries the earnings header.

### What is new

| Component | Why the rider app has no equivalent |
|---|---|
| `DutyToggle` | Large slide-to-go-online control, the app's single most-pressed element |
| `OfferCard` | Ride offer with a draining countdown ring, fare, distance and accept/decline |
| `EarningsBar` | Today's net against a driver-set goal, on the map header |
| `StatusBanner` | Persistent strip explaining why dispatch is unreachable (suspended, doc expired, GPS off) |
| `DocumentRow` | Document with status pill and expiry date |
| `SwipeAction` | Slide-to-confirm for the four irreversible trip transitions |

`SwipeAction` exists for one reason: a driver holding a phone in traffic misfires taps. "Start
trip" and "Complete trip" write to the trip state machine and cannot be undone — those get a
swipe, everything else gets a tap.

---

## Navigation

Four tabs, mirroring the rider app's shape so both apps feel the same in the hand.

| Tab | Rider equivalent | Purpose |
|---|---|---|
| **Drive** | Home | Map, duty toggle, incoming offers |
| **Earnings** | Wallet | Today/week/month, breakdown, payouts |
| **Trips** | Rides | Completed trip history and receipts |
| **Account** | Profile | Profile, vehicle, documents, settings |

Two stacks push over the tabs:

- **Onboarding** — runs once, before dispatch eligibility. Mirrors the `DriverOnboardingStatus`
  machine in [11-State-Machines.md](11-State-Machines.md).
- **Active trip** — takes over the whole screen from offer to rating. The tab bar is hidden for its
  entire length; a driver mid-trip has exactly one thing to do.

---

## Screens

### Onboarding — REGISTERED → APPROVED

One screen per state transition, so a rejection can send the driver back to exactly the step that
failed rather than to the start.

| Screen | Machine state it produces | Notes |
|---|---|---|
| Splash, Welcome, SignIn, CreateAccount, VerifyOtp | `REGISTERED` | Same screens as the rider app, different copy. `{ app: "DRIVER", role: "DRIVER" }` on the API calls |
| PersonalDetails | `PROFILE_SUBMITTED` | Name, DOB, address, profile photo |
| VehicleDetails | — | Make, model, year, plate, colour, `VehicleType`. Seat count validates per type, not the flat 1..64 the SQL CHECK allows |
| UploadDocuments | `DOCUMENTS_SUBMITTED` | One `DocumentRow` per `DriverDocumentType`. Camera or file, per-item status |
| BankDetails | — | Payout destination. Blocks payout, not dispatch — a driver can drive before this exists |
| UnderReview | `UNDER_REVIEW` | Dead-end screen with a checklist of what was received. Polls status |
| Approved | `APPROVED` | Confetti moment, then straight to Drive with the toggle pulsing |
| Rejected | `REJECTED` | Per-document reason and a re-upload button. Never a generic "rejected" |
| Suspended | `SUSPENDED` | Reason, effective date, support link. Blocks the app below the Account tab |

The onboarding stack is resumable. A driver who closes the app at document upload reopens on
document upload, because the server state, not local navigation, decides the entry point.

### Drive — the home screen

Full-bleed map. Three layers over it:

1. **Top:** duty pill (Online/Offline), `EarningsBar` with today's net, notification bell.
2. **Bottom sheet, offline:** big `DutyToggle`, today's summary (trips, hours, net), and a
   "why you're not getting offers" `StatusBanner` when something blocks dispatch.
3. **Bottom sheet, online:** compact status ("Looking for rides nearby"), demand hint, and the
   toggle collapsed to a small off-duty button so it cannot be hit by accident.

Going offline mid-trip is not offered. Going offline with an accepted offer asks for confirmation.

### Offer and trip — the state machine, one screen per state

Straight parity with the ride request machine, seen from the other side. The rider app's
`FindingDriver`/`DriverAssigned` pair is this app's `RideOffer`/`NavigateToPickup` pair — same
moment, opposite actor.

| Screen | Ride request state | Primary action |
|---|---|---|
| RideOffer | `SEARCHING` → offer sent | Accept / Decline, countdown ring. Full-screen takeover with sound and haptics |
| OfferLost | — | Shown when another driver accepted first. Two seconds, then back to Drive |
| NavigateToPickup | `DRIVER_ASSIGNED` / `DRIVER_ARRIVING` | Navigate, call/message rider, cancel |
| ArrivedAtPickup | `DRIVER_AT_PICKUP` | "I've arrived" → waiting timer, rider contact, verification code entry |
| TripInProgress | `TRIP_STARTED` | Navigate to dropoff, swipe to complete, safety button |
| TripCompleted | `COMPLETED` | Fare breakdown, this trip's net, next-trip prompt |
| RateRider | — | Stars plus optional tags. Skippable |
| CancelTrip | `CANCELLED_BY_DRIVER` | Reason list. States the fee and rating consequence before confirming |

`OfferLost` is not a nicety. Dispatch is concurrency-safe by rule
([04-Business-Rules.md](04-Business-Rules.md)) — two drivers will race for one ride and one will
lose. Losing must read as normal, not as a bug.

### Earnings

The screen the driver checks most after Drive, and the one that decides whether they keep the app
installed.

- Period switcher: Today / Week / Month.
- Hero: **net**, not gross. The number a driver can spend.
- Breakdown per [04-Business-Rules.md](04-Business-Rules.md): gross fare, platform fee, taxes,
  adjustments, tips, net. Every line is a separate row because the rule requires they be
  distinguishable — a single "earnings" figure fails an audit and fails driver trust.
- Per-trip list, each row opening the trip's own breakdown.
- Payouts: balance, next scheduled date, history, each entry reconcilable to its settlement record.

Adjustments and refunds appear as their own dated rows. Historical values never change on screen,
because they never change in the ledger.

### Account

Profile · Vehicles · Documents (with expiry warnings) · Payout method · Ratings and acceptance
stats · Notifications · Privacy · Help · Sign out.

Documents is the live one: an approved licence that lapsed is invalid, so the row shows a countdown
inside 30 days of expiry and the app surfaces a `StatusBanner` on Drive once it lapses.

---

## Blocked states

The partner app's real complexity is not the happy path, it is the eleven reasons a driver taps
"Go online" and nothing happens. Each gets a named cause and a next action, never a spinner.

| Cause | Where it shows | What the driver can do |
|---|---|---|
| Onboarding incomplete | Drive, `StatusBanner` | Resume at the failing step |
| Under review | Drive, `StatusBanner` | Nothing. Shows what was received and when |
| Rejected / suspended | Full-screen | Re-upload or contact support |
| Document expired | Drive, `StatusBanner` | Re-upload the named document |
| Vehicle not approved | Drive, `StatusBanner` | Check vehicle status |
| Location permission denied | Drive, blocking sheet | Open settings |
| GPS unavailable | Drive, `StatusBanner` | Wait, or move |
| Outside service area | Drive, `StatusBanner` | Map shows the nearest active zone |
| Network offline | Global strip | Retry. Duty state is server-owned, never assumed |
| Battery saver killing background location | Drive, one-time warning | Whitelist the app |
| Unpaid balance / negative wallet | Drive, `StatusBanner` | Settle |

These come from [16-Edge-Cases-and-Errors.md](16-Edge-Cases-and-Errors.md) and are the difference
between a demo and a product. A buyer evaluating this codebase will look for exactly this table.

---

## Deliberate stand-ins for the static pass

Same discipline as the rider app: build the UI first against mock data, name every fake thing.

| Screen | Stand-in | Replace with |
|---|---|---|
| Drive | Offers fire on a timer | Dispatch offer over WebSocket (T10) |
| Drive | Duty toggle flips local state | `PUT /driver/duty-status` (T7) |
| NavigateToPickup | Static polyline | Turn-by-turn handoff to Google/Apple Maps |
| ArrivedAtPickup | Any 4 digits pass | Server-issued pickup code (T11) |
| Earnings | Numbers from `data/mock.ts` | `driver_earnings` (T13) |
| UploadDocuments | Local image preview only | S3-compatible upload, `storage_key` never a public URL (T7) |
| TripInProgress | Fare ticks on a timer | Server-authoritative fare, driver device never computes money |

The last one is a rule, not a shortcut: the driver's phone displays fare, it never decides it.

---

## Why this matters to a buyer

- **One design system, two apps.** Same tokens, same components, same navigation grammar. A third
  app — admin, ops — inherits the same and costs a fraction.
- **Screens map to state machines, not to screenshots.** Every screen above names the state it
  produces, so the UI and the backend cannot drift silently.
- **The failure table is written down.** Anyone can build the happy path.
- **Money is presented to audit standard.** Gross, fee, tax, adjustment, net — separated on screen
  because they are separated in the ledger.

---

## Build order

Follows [15-Phase-Plan.md](15-Phase-Plan.md), so the app grows as the backend does.

1. Tokens, components, navigation shell — nothing new invented, copied from the rider app.
2. Onboarding stack — the backend schema for it already exists (T7).
3. Drive screen with duty toggle and mock offers.
4. Offer and trip stack — the whole state machine, static.
5. Earnings and Account.
6. Wire to the API, screen shapes unchanged, exactly as the rider app plans to.
