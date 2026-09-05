# Business Readiness and New Revenue Lines

A deep pass over what RideX would need to be run as a business, and what it could sell beyond
rides. Written against the code as it stands on 2026-09-05, not against the plan.

Two documents already cover strategy and are not repeated here:
[27-Unique-Feature-Set.md](27-Unique-Feature-Set.md) argues *which differentiators to build*, and
[18-Future-Project-Ideas.md](18-Future-Project-Ideas.md) lists follow-on products. This one asks a
narrower question: **what is missing before real money could move through this, and which new line
would be cheapest to add given what is already built.**

RideX is deployed as a demo, not a live service ([31](31-Deployment-and-CI-CD.md)), so nothing
here is a blocker on anything today. It is written to be *explained*: this is the list that answers
"what would it take to actually run this", and having a specific, costed answer to that question is
a stronger thing to show than a half-built version of any single item on it.

---

## Part 1 — What the platform already is

Worth stating plainly, because it decides what is cheap to add next.

| Capability | State | What it unlocks |
|---|---|---|
| Dispatch: offers, accept/reject, expiry, widening search waves | Real | Anything that needs "find a nearby driver" |
| Trip lifecycle with an append-only status history and actor | Real | Delivery, logistics, disputes, safety records |
| Pickup verification by OTP and QR | Real | Handover proof at either end of a journey |
| Fare model: base + per km + per minute + waiting + surge, per ride type | Real | Any priced journey; a parcel is a journey with a box in it |
| Append-only ledger, driver earnings, commission on gross, platform-funded discounts | Real | Wallets, settlements, refunds, COD reconciliation |
| Payments: cash and Razorpay orders, webhooks, idempotency keys | Real | Prepaid anything |
| Points with an audited entry per movement, per-journey cap, ops-set rate | Real | Loyalty, goodwill credits, promotional currency |
| Seat inventory on a timetable, sold per leg, with a database exclusion constraint | Real | Shuttle, pooled delivery, any capacity-on-a-schedule product |
| Invoices as PDF with payment status, method and gateway reference | Real | Expense claims, GST invoicing, corporate billing |
| Support tickets with a message thread | Real (backend) | Disputes, claims, incident handling |
| Vehicle types down to bicycle and scooter | Real | Two-wheeler delivery without a schema change |

The unusual asset here is not the ride flow — it is that **money and history are stored as
append-only facts**. Most of what follows is a rendering of data that already exists.

---

## Part 2 — Business readiness: what blocks real money

These are not features anybody demos. They are what an operator, an auditor or a bank asks for in
the first week, and none of them exist today.

### 2.1 A wallet the rider can hold money in — **required for almost everything below**

Points are not money: they cannot be refunded, withdrawn, or used for a partial payment. Today a
cancelled shuttle seat pays back in points *because there is nowhere else to put the money*.

A wallet gives: instant refunds without a gateway fee, prepaid balances, corporate top-ups, driver
tips, COD float, and promotional credit with a visible expiry. The ledger already models accounts
and entries, so this is a `RIDER` account type and a top-up flow, not new machinery.

**Effort:** M. **Blocks:** refunds, corporate, delivery COD, promotions.

### 2.2 Refunds that ops can actually issue

`PaymentProvider.refundPayment` exists and is called from nowhere. There is no ops route, no
refund record, no partial refund, and no rider-visible refund status. Every real operation issues
refunds daily.

**Effort:** S–M. Note that the `refunds` table already exists and is unused.

### 2.3 GST-compliant invoicing

The PDF invoice is good-looking and not compliant. For India it needs: supplier GSTIN, place of
supply, HSN/SAC code for passenger transport, tax split (CGST/SGST or IGST), invoice series that
is sequential and gapless per financial year, and the platform-vs-driver supply distinction (who
is the supplier of the ride matters for who pays the tax).

This is the single most common reason a mobility product cannot take corporate customers.

**Effort:** M, and it needs an accountant's input, not just code.

### 2.4 Driver payouts that clear

`driver_payouts` exists and settles by an ops action. There is no bank account on the driver (the
partner app collects bank details and never submits them), no payout gateway integration
(RazorpayX or similar), no TDS handling, and no payout schedule.

**Effort:** M. **Blocks:** having drivers at all, past the first week.

### 2.5 KYC and compliance on drivers

Documents are uploaded and reviewed by a human, which is a good start. Missing: licence expiry
tracking with automatic suspension, insurance and fitness certificate expiry, police verification,
vehicle permit class (a commercial permit is legally required and is not the same as a licence),
and an audit trail of who approved what — the last one exists in `audit_logs` and is not surfaced.

**Effort:** M. **Blocks:** operating legally.

### 2.6 Safety, properly

`SafetyScreen` in the partner app is a mock and the rider app has no SOS at all. A real one needs:
an emergency contact list, one-tap SOS that sends location and trip id to ops and to contacts, a
live "share my trip" link a non-user can open, and an incident record that an operator works
through to closure.

**Effort:** M. **Why it matters commercially:** it is the first question a corporate customer, a
woman rider, and a journalist all ask.

### 2.7 Fraud and abuse controls

Nothing today stops: a driver and rider colluding on fake trips, a rider farming referrals with
throwaway emails, GPS spoofing to claim distance, or a driver cancelling profitable-looking trips
repeatedly. The referral code has a qualifying-trips gate, which is the only control that exists.

Minimum viable set: device fingerprinting on signup, a velocity check on referrals, a
distance-versus-route sanity check at trip completion (this also catches gap 1 in
[29-Partner-App-Gaps.md](29-Partner-App-Gaps.md)), and a cancellation-rate threshold that flags to
a human rather than auto-deactivating.

**Effort:** M, and it never finishes.

### 2.8 Surge that is actually computed

`pricing_rules.surge_multiplier` is a stored constant. Nothing raises it by demand, area or time.
Either compute it from live supply and demand, or remove the column — a surge field nobody moves is
a lie in the schema.

**Effort:** M for real surge; S to make it schedulable by ops.

### 2.9 Scheduled rides

There is no way to book a ride for later. The shuttle proves the platform can hold future
inventory, so the hard part is done conceptually. A scheduled ride needs a reservation, a dispatch
trigger some minutes before, and a guarantee policy for when nobody accepts.

**Effort:** M. **Commercially:** airport runs are the highest-value ride segment and they are all
scheduled.

---

## Part 3 — Delivery of small parcels

The line the business asked about. The analysis is: **most of it already exists.**

### What a parcel journey is, in this codebase

A delivery is a trip with three differences:

1. **No passenger.** Seat capacity is irrelevant; the constraint is a size and weight class.
2. **Two handovers, not one.** A ride verifies at pickup. A parcel verifies at pickup *and* at
   drop — the recipient's OTP is the same mechanism as the pickup code, at the other end.
3. **A third party.** The recipient is usually not a user of the app and must be reachable by SMS
   and a tracking link without installing anything.

Everything else — dispatch, offers, the trip status machine, live location, the fare model, cash or
online payment, the invoice, the ledger, ratings — is unchanged.

### What has to be built

| Piece | Notes | Effort |
|---|---|---|
| `parcels` table | sender, recipient name and phone, description, declared value, size class, fragile flag, instructions | S |
| Delivery ride types | `PARCEL_BIKE`, `PARCEL_AUTO`, `PARCEL_VAN` in `ride_types` with their own `pricing_rules`. `seat_capacity` becomes a weight class for these rows — or better, add a `category` column so a delivery type is not pretending to carry passengers | S |
| Drop verification code | The same generator and hash as the pickup code, checked at the drop | S |
| Proof of delivery | A photo at handover, plus who received it. Needs object storage — `DocumentStorage` currently writes to local disk and says in its own warning that it must be replaced before deploying | M |
| Recipient tracking link | A signed, expiring URL showing the live position and ETA, with no login | M |
| Cash on delivery | The driver collects for the *sender's goods*, not the fare. That money is not the platform's revenue and must sit in its own ledger account until remitted — do not conflate it with the fare | M |
| Prohibited items and liability | A declared-value cap, a prohibited list the sender accepts, and an insurance or compensation policy. This is a legal decision before it is a code change | S to build, real work to decide |
| Multi-stop | One pickup, several drops, in sequence. The shuttle's per-leg model is the closest existing analogue | M |

### Effort and sequence

A single-drop, prepaid, two-wheeler parcel service on top of what exists is **weeks, not months** —
the expensive parts (dispatch, tracking, payments, ledger) are done. Multi-stop, COD and proof-of-
delivery photos are what turn it into a real product.

**Do it in this order:** parcel type and fare → drop OTP → recipient tracking link → proof of
delivery → COD → multi-stop.

### The honest commercial caveat

Consumer parcel delivery is a low-margin knife fight against Porter, Dunzo's remains, and every
quick-commerce fleet. **The margin is in B2B**: a chain of pharmacies, a lab collecting samples,
a bakery with daily runs, a documents courier for a law firm. Those customers want scheduled
recurring pickups, a monthly invoice and a proof-of-delivery archive — all of which this platform
is unusually well-placed to give them, because it already stores an auditable history and issues
real invoices.

---

## Part 4 — Other lines worth having, ranked by cost over value

### 4.1 Corporate accounts — **best return for the effort**

An employer prepays or is billed monthly; employees ride under a policy (spend cap, hours,
geography, ride type); finance gets one consolidated GST invoice and a per-employee report.

Everything needed exists except the org model: `organisations`, employee membership, a policy
check at booking, and billing against the corporate wallet rather than the rider's card.

**Effort:** M. **Value:** predictable revenue, higher fares, near-zero acquisition cost per rider,
and no discounting war. It also makes 2.3 (GST invoicing) mandatory, which is fine — that is
needed anyway.

### 4.2 Subscriptions and passes — **half built already**

`PassProduct`, `Pass`, ride limits and validity windows exist, and `PassService.buy` charges
nobody (see [28-Rider-App-Gaps.md](28-Rider-App-Gaps.md), 10c). Finish the purchase, then extend
beyond the shuttle: a monthly commuter pass, a "10 rides a month" pack, a delivery pack for a small
business.

**Effort:** S to finish what exists, M to generalise beyond one route.

### 4.3 Intercity and return-leg matching

Already argued in 27 (feature 7). Worth repeating here for one reason: a driver returning empty
from an intercity drop is pure waste, and matching it is the only feature on this list that
*creates* margin instead of dividing it.

**Effort:** M.

### 4.4 Rentals — car with driver, by the hour

An hourly package (4h/40km, 8h/80km) with overage rates. The fare model needs a package concept,
not a per-km line. Weddings, site visits and airport waits are steady demand and nobody serves them
well in tier-2 cities.

**Effort:** M.

### 4.5 Ambulance and medical transport

Serious demand, high trust, and the platform's audit trail is a genuine advantage. But it needs
certified vehicles, trained staff and a regulatory posture. **Not a feature — a separate business.**
Listed so it is a deliberate decision rather than an accident.

### 4.6 Advertising and merchant offers

In-app placements for local merchants, or a partner-offers tab funded by them. Cheap to build, and
it dilutes the "transparent, uncluttered" positioning that 27 is built on. **Recommend against
until there is volume worth selling.**

### 4.7 Fleet operator accounts — the multiplier

Today a driver owns their vehicle. In reality most Indian fleets are 5–50 vehicles under one owner
who employs drivers. Supporting a fleet owner — vehicles, driver assignment, consolidated earnings,
a payout split — is how supply is acquired in batches of thirty instead of one at a time.

This is `RideX FleetOS` from doc 18, and it is arguably the highest-leverage item in this entire
document, because **supply acquisition is the actual bottleneck in this market, not demand.**

**Effort:** L. **Value:** very high.

---

## Part 5 — What to do, in order

**Tier 0 — before anyone real uses it.** Not optional, not impressive, non-negotiable.
1. Fix the four gaps in [31-Deployment-and-CI-CD.md](31-Deployment-and-CI-CD.md) ("what to fix
   before showing it to anyone") — especially the hardcoded trip distance, which mis-prices every
   fare.
2. Driver payouts that clear (2.4) and refunds ops can issue (2.2).
3. Safety and SOS (2.6).

**Tier 1 — makes it a business.**
4. Wallet (2.1) — unlocks refunds, corporate, COD.
5. GST invoicing (2.3).
6. Corporate accounts (4.1).
7. Finish passes and subscriptions (4.2).

**Tier 2 — the second product.**
8. Parcel delivery, single-drop and prepaid (Part 3), then COD and multi-stop.
9. Fleet operator accounts (4.7).

**Tier 3 — when there is evidence.**
10. Scheduled rides (2.9), real surge (2.8), intercity return-leg (4.3), rentals (4.4).

Two things not on this list on purpose: advertising, and building all of it. Doc 27 already makes
the argument — **three finished differentiators beat thirteen half-built ones**, and that applies
to business lines even more than to features.
