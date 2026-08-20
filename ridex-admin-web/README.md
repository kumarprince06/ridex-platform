# RideX Console

React + TypeScript + Vite operations panel. **Static UI only** — no network calls, no backend
wiring. Every screen reads `src/data/mock.ts`.

The design it implements is [docs/23-Admin-Panel-Design.md](../docs/23-Admin-Panel-Design.md).
Read that first: it explains the permission model, and every screen here maps to an FR-OPS or
FR-PLAT requirement in [docs/05](../docs/05-Functional-Requirements.md).

## Running

```bash
cd ridex-admin-web
npm install
npm run dev          # http://localhost:5174
npm run typecheck    # tsc --noEmit
npm run build        # type-check and bundle
```

Node 20+, same as the two apps.

## Signing in

The login screen is a role picker — the static stand-in for `POST /auth/login` with
`app: "ADMIN"`. Pick a role to see the console as that role sees it:

| Role | Permissions | What disappears |
|---|---|---|
| Support agent | `SUPPORT_CASE` | Payments, payouts, approvals, config, audit |
| Operations admin | `OPERATIONS`, `SUPPORT_CASE` | Payments, payouts, templates, flags, staff |
| Finance | `FINANCE` | Approvals, live map, config, cases |
| Super admin | all | nothing |

That picker exists so every permission path is walkable from day one. The fastest way to ship a
console whose finance-only screens have never been looked at is to develop the whole thing as a
super admin.

## Permissions, not roles

`src/auth/permissions.ts` holds the seven permissions from
[docs/14-Security.md](../docs/14-Security.md). Screens ask `can('FINANCE')`, never
`role === 'FINANCE'` — a role is a bundle someone will want to change, and every screen that
tested the role name has to be found and edited when they do.

Two rules the code enforces:

- **Hidden and guarded.** `Shell.tsx` filters the nav; `App.tsx` wraps the route. Hiding stops it
  being found, guarding stops it being reached by typing the URL — only the second is a security
  control.
- **Nothing renders disabled.** A greyed-out Refund button tells an agent exactly what to
  social-engineer their way toward, so an unavailable action is absent instead.

## Every destructive action takes a reason

`ConfirmWithReason` is the component the whole design leans on. Refunds, suspensions, document
rejections, flag flips and role changes all route through it, so the mandatory reason cannot be
forgotten by whoever builds the next screen. Twelve characters minimum, free text always allowed —
a fixed dropdown makes people pick the nearest lie.

## Layout

```
src/
├── theme.css            design tokens, shared with the apps plus table-specific ones
├── auth/                permissions, role bundles, session context
├── components/          Shell, ConfirmWithReason, and the shared UI set
├── data/mock.ts         every fake value in the console, in one file
└── pages/               one file per screen
```

## Deliberate stand-ins

| Area | Stand-in | Replace with |
|---|---|---|
| Auth | Role picker | `POST /auth/login` with `app: "ADMIN"`; permissions from the token |
| All lists | `src/data/mock.ts` | Paged API queries via TanStack Query |
| Live map | Four fixed positions | Driver location from Redis over the socket (T8, T11) |
| Refunds and payouts | Form closes and shows a notice | `refundPayment` with an idempotency key (T12) |
| Audit log | Static rows | `audit_logs`, which does not exist yet — T1 deferred it, T15 needs it |

## Notes for wiring

- Money is never edited. Refunds and adjustments append records; no screen offers a field that
  rewrites a historical figure, because [docs/04](../docs/04-Business-Rules.md) forbids it.
- Card numbers are masked everywhere and never fetched in full.
- Support raises cases; finance releases money. Keep that split when the endpoints land — one
  person doing both is the most common internal-fraud pattern in a marketplace.
