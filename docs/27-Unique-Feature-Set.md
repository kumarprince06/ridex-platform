# RideX B2C — Unique Feature Set

[17-RideX-Differentiators.md](17-RideX-Differentiators.md) lists product directions. This document
is narrower: features that Uber, Ola and inDrive **do not offer today**, that RideX can build
because of decisions already made in [24-HLD](24-HLD-High-Level-Design.md) and
[25-LLD](25-LLD-Low-Level-Design.md), and that a rider or driver would switch apps for.

The filter applied to everything below:

1. **A competitor genuinely does not do it** — not "does it badly".
2. **It falls out of the architecture** rather than needing a new one. An append-only fare
   breakdown, an auditable ledger and a full trip status history make several of these nearly free;
   a platform with a single `fare_total` column cannot build them at all.
3. **It survives contact with abuse.** A feature that is trivially gamed is a liability.

Anything failing all three is marketing, and is marked as such.

---

## Tier 1 — Build these. They are the wedge.

### 1. The reconciling receipt

**What exists today:** every competitor quotes a fare, then charges a different one, and shows the
rider a single total with no derivation. "Why was I charged more" is the most common support contact
in ride-hailing and none of them answer it in-app.

**What RideX does:** the receipt shows the quote and the final side by side, line by line, and names
what moved.

```
Quoted 08:41            Charged 09:07
Base            60.00   Base            60.00
Distance  8.2km 98.40   Distance  8.9km 106.80   +0.7km · driver rerouted at Ring Rd
Time     18min  54.00   Time     26min   78.00   +8min · traffic
Discount       -40.00   Discount       -40.00
                       ─────────────────────────
Total          172.40   Total          204.80    +32.40
```

**Why RideX can and they can't:** `fare_breakdowns` is append-only lines, the quote is stored with
its expiry, and `trip_locations` holds the actual path. The comparison is a read. On a platform that
stores one total, the information to build this was thrown away at quote time.

**The rule that makes it matter:** a difference the rider did not cause — a driver's detour, not
traffic — is refunded automatically, without them asking. That single rule is the product.

**Cost:** small, after Steps 8, 10 and 11. **Abuse risk:** low.

---

### 2. The driver's auditable ledger

**What exists today:** drivers get a net figure. Commission rates change without notice, adjustments
appear unexplained, and the platform's own numbers cannot be reconstructed by the person they are
about. This is the number one driver grievance on every platform in this market.

**What RideX does:** every trip shows `gross → platform fee (rate shown) → adjustments (each named)
→ net`, exportable, with a per-line dispute button that opens a case with a stated SLA. Commission
rate changes are announced and dated in-app, and historical trips keep the rate that applied then.

**Why RideX can and they can't:** the ledger is append-only with an entry per movement. Reconstructing
this on a platform with a mutable balance column means reverse-engineering figures that were
overwritten.

**Why it wins:** driver supply is the constraint in this business, not rider demand. Drivers talk to
each other. A platform whose maths can be checked recruits through its own drivers.

**Cost:** small, after Step 12. **Abuse risk:** none — it is disclosure of your own data.

---

### 3. Evidence-based cancellation

**What exists today:** an opaque fee with no proof, and a dispute path that answers days later with
a template. Both sides believe they were the wronged party and neither can see anything.

**What RideX does:** a cancellation fee is presented with the evidence that justifies it — the
driver's GPS trace, arrival timestamp, and the waiting clock — visible to **both** parties. One tap
disputes it; a human reviews within a published SLA; the outcome cites the same evidence.

**Why RideX can and they can't:** `trip_status_history` is append-only with actor and timestamp, and
positions are trip-scoped. This is a query. Retrofitting it means having recorded the history all
along.

**Cost:** medium, after Step 10. **Abuse risk:** low, and it reduces support volume rather than
adding it.

---

## Tier 2 — Strong, and nobody in this market has shipped them properly.

### 4. The commuter pass

**What exists today:** shuttle services exist; a guaranteed seat sold as a subscription does not.
Uber and Ola have no route product; local shuttle operators have no reliable app.

**What RideX does:** a weekly or monthly pass on a fixed route with a **reserved seat** at a fixed
departure. The rider stops booking daily. Revenue is recognised up front, demand becomes predictable,
and the driver has a guaranteed load.

**Why RideX can:** Step 17 already builds `shuttle_trips` with seat inventory, Step 13 builds a
wallet with ledger accounts, and Step 16 builds real invoices. A pass is a prepaid ledger balance
that draws down against seat reservations — no new architecture.

**Why it is strategically the strongest item here:** it converts a marketplace with no switching
cost into a subscription. It is also the only feature on this list that changes the unit economics
rather than the experience.

**Cost:** medium, after Steps 13, 16 and 17. **Abuse risk:** pass sharing — bind the pass to the
account and check at boarding.

---

### 5. Expense-native invoicing

**What exists today:** competitors issue a trip summary that most finance teams reject, and their
corporate products are aimed at large accounts. An SME or a consultant claiming travel is left
assembling PDFs by hand.

**What RideX does:** a compliant tax invoice per trip with the correct fields, a consolidated
monthly invoice, cost-centre tagging at booking time, and a per-employee policy cap. Split fares
produce **one invoice per rider**, which no competitor does at all.

**Why RideX can:** Step 16 builds invoices as immutable snapshots with sequential numbering because
that is the correct way to build them. Consolidation and tagging are then small additions.

**Who it wins:** the rider who expenses their travel is high-frequency, price-insensitive, and
currently chooses on receipt quality alone. That is the cheapest customer in the market to take.

**Cost:** small-to-medium, after Step 16. **Abuse risk:** none.

---

### 6. Scheduled rides that are actually guaranteed

**What exists today:** a scheduled ride quietly degrades into an ordinary request at the scheduled
minute. If nobody accepts, the rider finds out at the airport.

**What RideX does:** an assignment window that opens well before departure, a confirmed driver by a
stated deadline, a fallback search if the assigned driver drops, and stated compensation if the
platform fails to deliver. The rider is told the moment a driver is confirmed, not at pickup time.

**Why RideX can:** it needs a scheduling workflow with recovery logic rather than a timestamp on a
ride request. Building it as a first-class workflow is the decision recorded in Step 19; it is only
hard if you started with the timestamp.

**Cost:** medium. **Abuse risk:** the compensation promise must be bounded and defined in policy
before launch.

---

### 7. Return-leg matching for intercity

**What exists today:** intercity trips are priced for a one-way with an empty return. The rider pays
for both legs and the driver drives one of them empty.

**What RideX does:** offer the return leg to riders travelling the opposite way in a window, and
split the saving between the driver and both riders when it matches.

**Why RideX can:** dispatch already searches candidates by geography and time; a return leg is that
search with a future window. The pricing engine already builds fares from lines, so a matched-return
discount is another line.

**Why it matters:** it is a real efficiency gain, not a subsidy. The price is lower because the cost
is lower, which means it survives the end of discounting.

**Cost:** medium-to-large, after Steps 8 and 9. **Abuse risk:** collusion between a driver and a fake
return rider — cap the discount and monitor pairs.

---

### 8. The verifiable safety record

**What exists today:** live trip sharing that expires when the trip ends. After the fact there is
nothing to show anyone.

**What RideX does:** a shareable link showing the full timeline — booked, assigned, arrived, started,
any route deviation, completed — with timestamps, and which **remains valid after the trip** as a
record the rider can hand to an employer, a parent or the police.

**Why RideX can:** `trip_status_history` is append-only and already exists for dispute handling. The
safety timeline is a different rendering of the same rows.

**Cost:** small, after Step 10. **Abuse risk:** the link must be revocable and must never expose the
driver's home area or a live position after completion.

---

## Tier 3 — Worth doing, but they are polish, not a reason to switch.

| Feature | Gap it fills | Cost |
|---|---|---|
| **Assisted and accessible rides** | Wheelchair-capable vehicles, elderly assistance, drivers with recorded training. Nominally offered elsewhere, effectively unavailable. Needs real vehicle tagging and driver certification, not a checkbox | M |
| **Wallet with visible promo expiry** | Promotional credit everywhere else is a mystery balance that vanishes. Show every credit, its source and its expiry date | S |
| **Multi-option booking with honest trade-offs** | Show price, ETA and comfort side by side, including "wait 6 minutes and pay 18% less" | S |
| **Driver fatigue limits** | Hour caps and enforced breaks. Sell it as safety, because it is | S |
| **Low-connectivity booking** | SMS or USSD fallback for tier-2/3 areas where the app cannot complete a booking | M |
| **Per-line fare dispute for riders** | The rider mirror of feature 2 — dispute one line, not the whole trip | S |

---

## Deliberately rejected

Stated here so they do not get re-proposed every quarter.

| Idea | Why not |
|---|---|
| **Rider-driver price bargaining (inDrive's model)** | It works, but it is their identity and it is a race to the bottom on driver income. RideX competes on transparency, which is the opposite promise |
| **Showing drivers why they lost an offer** | Sounds like transparency, is actually a specification for gaming dispatch. Publish the *policy*, never the per-offer decision |
| **An algorithmic driver "quality score" with automated penalties** | Opaque punitive automation is the thing drivers hate most. Score for internal routing if you must; never let it deactivate anyone without a human |
| **Crypto, NFT loyalty, an in-app social feed** | No demand, unbounded compliance exposure, and a permanent maintenance cost |
| **Building all thirteen features above** | [15-Phase-Plan.md](15-Phase-Plan.md) says validate two or three. Thirteen half-built differentiators is worse than one finished one |

---

## Recommended sequence

**Ship first — the transparency trio.** Features 1, 2 and 3 are one coherent promise: *RideX shows
you the arithmetic.* They share the same data, they are all cheap once Steps 8–12 exist, and
together they are a positioning a competitor cannot copy without rebuilding their fare and ledger
storage.

**Ship second — the commuter pass (4).** It is the only item here that changes the business model
rather than the experience, and it makes revenue predictable.

**Ship third — expense-native invoicing (5).** Smallest effort of the tier-2 items, and it takes the
most valuable rider segment in the market.

Everything else waits for evidence that these four worked.

---

## What this depends on

Every tier-1 feature is a **rendering of data the platform stores because storing it that way was
correct anyway**:

| Feature | Depends on | Built in |
|---|---|---|
| Reconciling receipt | Append-only `fare_breakdowns`, stored quote, `trip_locations` | Steps 8, 10 |
| Driver ledger | Append-only `ledger_entries`, per-trip commission lines | Steps 11, 12 |
| Evidence-based cancellation | `trip_status_history` with actor and timestamp | Step 10 |
| Commuter pass | Seat inventory, wallet ledger, invoices | Steps 13, 16, 17 |
| Expense invoicing | Immutable invoice snapshots | Step 16 |
| Safety record | `trip_status_history` | Step 10 |

Which is the actual argument for the architecture: the differentiators are not features bolted on
afterwards, they are what a correctly-stored history lets you show. Build the schema wrong in Step 8
and none of Tier 1 is available at any price.
