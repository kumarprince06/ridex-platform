# RideX Admin Panel — Design

The operations console, called **RideX Console**. Web, not mobile: `ridex-admin-web`.

Scope here is the design — what the screens are, who may see each one, and what every destructive
action must record. The backend it needs is T15 in [21-Gap-Tasks.md](21-Gap-Tasks.md), and the
stack is fixed by [19-Technology-Stack.md](19-Technology-Stack.md): React + TypeScript + Vite,
React Router, TanStack Query, React Hook Form, Zod.

---

## The one idea

**The apps are used by one person about their own trip. The console is used by one person about
everyone else's.**

Every difference follows from that. A rider taps through their own ride; an agent opens a stranger's
trip, changes something that costs money, and leaves a trace someone will read months later in a
dispute.

| | Rider / Partner apps | Console |
|---|---|---|
| Acting on | Your own record | Someone else's record |
| Primary surface | Map | Table |
| Session | Minutes, on the move | Hours, at a desk |
| Wrong tap costs | A cancelled ride | A refund, a suspension, an audit finding |
| Every write needs | Confirmation | Confirmation **plus a reason, plus an audit row** |
| Theme | Dark, one column | Light default, dense, multi-column |

Consequences that hold across every screen:

1. **No destructive action without a typed reason.** Refunds, adjustments, suspensions and role
   changes each take free text that lands in the audit log. A confirm dialog with only "Are you
   sure?" is not a control, it is a speed bump.
2. **Nothing financial is ever edited.** Refunds and adjustments write new rows.
   [04-Business-Rules.md](04-Business-Rules.md) forbids altering historical transaction meaning,
   so the UI must not offer a field that looks editable.
3. **Every list is a search.** Operations arrives knowing a phone number, a trip ID or an email —
   never a page number.
4. **The screen shows what the user may do, not what the app can do.** See below.

---

## Permissions, not roles

[14-Security.md](14-Security.md) names seven permissions; [07-Roles-and-Permissions.md](07-Roles-and-Permissions.md)
says to authorize on permissions even while roles are the UI representation. The console follows
the same rule the backend does: **navigation and actions render from the permission set on the
token.** A role is a named bundle, nothing more.

The implemented backend already has the roles — `SUPPORT`, `OPS_ADMIN`, `SUPER_ADMIN` in
`UserRole` — and `AppContext.ADMIN` to scope a login to this surface.

| Capability | SUPPORT_CASE | OPERATIONS | FINANCE | SUPER_ADMIN |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Search riders / drivers | ✓ | ✓ | ✓ | ✓ |
| View trip detail and timeline | ✓ | ✓ | ✓ | ✓ |
| Create and update support cases | ✓ | ✓ | — | ✓ |
| Approve / reject driver documents | — | ✓ | — | ✓ |
| Suspend or reinstate a driver | — | ✓ | — | ✓ |
| Live trip map | — | ✓ | — | ✓ |
| Pricing rules, ride types, promotions | — | ✓ | — | ✓ |
| Issue a refund | — | — | ✓ | ✓ |
| Earnings adjustments, payout retries | — | — | ✓ | ✓ |
| Notification templates, feature flags | — | — | — | ✓ |
| Admin users and role assignment | — | — | — | ✓ |
| Read the audit log | — | ✓ | ✓ | ✓ |

Two rules this table encodes, both deliberate:

- **Support cannot refund.** An agent raises the case; finance releases the money. One person
  doing both is the single most common internal-fraud pattern in a marketplace.
- **Nobody grants their own permissions.** Role assignment is SUPER_ADMIN only, and a super admin
  changing their own row is refused — someone else does it.

A permission the user lacks does not render as a disabled control. It does not render at all, and
the route 403s if typed directly. A greyed-out Refund button tells an agent exactly what to social-
engineer their way toward.

---

## Screens

### Dashboard — FR-OPS-001

Answers "is the marketplace healthy right now?" in one screen: live trips by state, drivers online
vs. offline, requests unmatched in the last 15 minutes, cancellation rate, payment failure rate,
today's GMV and platform fee. Each tile links to the filtered list behind it — a number nobody can
drill into is decoration.

### Riders and Drivers — FR-OPS-002, FR-OPS-003

- **Search** by phone, email, name or ID. One box, not a filter builder.
- **Rider detail**: profile, trips, payment methods (masked, never full PAN), cases, current state.
- **Driver detail**: profile, vehicle, documents with expiry, onboarding state, ratings and rates,
  earnings summary, trips, cases.
- **Approval queue**: the drivers sitting in `UNDER_REVIEW`, oldest first, each document viewable
  and approvable one at a time with a rejection reason per document — the partner app's Rejected
  screen renders exactly what is typed here, so a lazy "docs unclear" is a driver who cannot fix it.
- **Suspend / reinstate**: reason, effective date, and whether it blocks payouts as well as dispatch.

### Trips — FR-OPS-004

- **List**: filter by state, time, city, driver, rider, payment status.
- **Detail**: the ride request state machine from [11-State-Machines.md](11-State-Machines.md) drawn
  as a timeline with a timestamp and an actor per transition, the route, the fare breakdown, the
  payment record and any cases. This is the screen a dispute is settled on, so it must show who did
  what and when, not just where the trip ended.
- **Live map**: trips in flight, driver positions, colour by state.

### Payments and refunds — FR-OPS-006, FR-OPS-007

Payments list with provider correlation IDs, and per-payment: the event ledger, not a balance.
Refunds are a form — amount (full or partial), reason, case reference — that creates a refund
record. Idempotency key is shown so a support agent and an engineer are looking at the same
identifier when something goes wrong.

### Earnings and payouts — FR-OPS-006

Driver earnings, settlements, payout batches, failed transfers with retry. Adjustments are new
dated rows with a reason and an author; nothing recalculates a historical figure.

### Support — FR-OPS-008

Case queue with category, priority, SLA age and assignee. Case detail links to the trip, the users
and any financial action taken, so the resolution and its cost are visible together.

### Configuration — FR-OPS-005, FR-OPS-009, FR-PLAT-001..004

Ride types, pricing rules (base, per-km, per-minute, surge windows, cancellation fees), promotions,
notification templates, feature flags. Every one of these is versioned and shows who changed it
last — a pricing rule edited without a trail is an unanswerable question at the end of the month.

### Audit — FR-OPS-010

Every privileged action, filterable by actor, entity, action type and date. The console's own
credibility rests on this screen, so it is read-only for everyone including SUPER_ADMIN.

---

## Layout and design system

One shell: a fixed left nav (rendered from permissions), a top bar with global search and the
signed-in identity, and a content area. No nested sidebars — a second level of navigation in an
ops tool is a sign the information architecture is wrong.

**The same tokens as the apps**, extended rather than replaced. The mobile palette is dark-only and
built for one-column reading; the console needs a light default and dense table styling. So:
the token *values* carry across as CSS custom properties, and the console adds surface, row,
header and focus tokens for tables. Three surfaces that look like one product is a selling point.

No MUI, no Ant Design. Both bring an opinionated look that would make the console read as a
different vendor's software, and both cost more to override than a small component set costs to
write: Table, Filters, Detail panel, Timeline, StatTile, StatusPill, ConfirmWithReason, EmptyState.

`ConfirmWithReason` is the component the whole design leans on — every destructive action routes
through it, so the reason field cannot be forgotten by whoever builds the next screen.

---

## States that are not the happy path

An ops tool is judged on these, the same way the partner app is judged on its blocked states.

| State | What the console shows |
|---|---|
| No results | What was searched, and the nearest thing to try |
| Loading | Skeleton rows, never a full-page spinner that discards the query |
| Stale data | Last-updated time on live screens, with a manual refresh |
| Permission denied | Which permission is missing and who to ask, not "403" |
| Action failed | The provider error and the idempotency key, so it can be retried safely |
| Concurrent edit | "Someone else changed this while you were editing" with both values |
| Partially applied | A refund that succeeded at the provider but failed to record is a first-class state, not a crash |

---

## Deliberate stand-ins for the static pass

Same discipline as the two apps: build the UI against mock data, name every fake thing.

| Area | Stand-in | Replace with |
|---|---|---|
| Auth | Role picker on the login screen | `POST /auth/login` with `app: "ADMIN"` and the token's permissions |
| All lists | `src/data/mock.ts` | Paged API queries via TanStack Query |
| Live map | Fixed driver positions | Driver location from Redis over the socket (T8, T11) |
| Refunds | Form validates and closes | `refundPayment` with an idempotency key (T12) |
| Audit log | Static rows | `audit_logs`, which does not exist yet (T1 deferred it, T15 needs it) |

---

## Build order

1. Shell — routing, permission-driven nav, the token set, the component set.
2. Login with the role picker, so every permission path is walkable from day one.
3. Read-only screens: dashboard, riders, drivers, trips, audit.
4. Write screens, each through `ConfirmWithReason`: approvals, suspensions, refunds, config.
5. Wire to the API, screen shapes unchanged.

The permission model is the part worth getting right before any of it: it is cheap now and
expensive after twenty screens have been written assuming otherwise.
