# RideX Partner App

React Native (Expo) driver-facing app. **Static UI only** — no network calls, no backend wiring.
Every screen holds local state and navigates on tap.

The design it implements is [docs/22-Partner-App-Design.md](../docs/22-Partner-App-Design.md). Read
that first: it explains why the app is shaped the way it is, and every screen name here maps to a
state in [docs/11-State-Machines.md](../docs/11-State-Machines.md).

## Running

```bash
cd ridex-partner-app
npm install
npm run android      # or: npm run ios
```

`@maplibre/maplibre-react-native` needs the native project, so Expo Go will not run this app — `npm run android`
builds and installs it on a connected device. The `android/` and `ios/` folders are generated and
git-ignored; delete them and they rebuild.

```bash
npm run device       # metro over adb reverse, for an already-installed build
npm run typecheck    # tsc --noEmit
```

## Pinning

Expo **SDK 54** and React Native **0.81.5**, matching `ridex-rider-app`. Both apps upgrade
together — a shared design system across two SDK versions drifts within a release.

## Layout

```
App.tsx                  font loading, providers, status bar
src/
├── theme.ts             design tokens, shared with the rider app plus the duty block
├── navigation/
│   ├── types.ts         route map and params
│   ├── RootNavigator.tsx
│   └── MainTabs.tsx     Drive · Earnings · Trips · Account
├── components/          shared with the rider app, plus the partner-only ones below
├── data/mock.ts         every fake value in the app, in one file
└── screens/             one file per screen
```

`src/theme.ts` is copied from the rider app byte for byte, apart from four added tokens
(`online`, `offline`, `warning`, `success`) for duty status and document review. Two apps, one
product: fix the token, never the screen.

## Partner-only components

Fourteen components come across from the rider app unchanged. These six do not exist there:

| Component | Why |
|---|---|
| `DutyToggle` / `DutyPill` | Going on and off duty — the most-pressed control in the app |
| `OfferCard` | Ride offer with a draining countdown, fare and route |
| `EarningsBar` | Today's net against the driver's goal |
| `StatusBanner` | Why dispatch cannot reach you, and what to do about it |
| `DocumentRow` | Document with status pill and expiry |
| `SwipeAction` | Slide-to-confirm for the trip transitions that cannot be undone |
| `RiderBar` | Rider identity plus call and message, from accept to drop-off |

`SwipeAction` exists because a driver holding a phone in traffic misfires taps. Start trip,
complete trip and cancel write to the trip state machine — those swipe; everything reversible taps.

## Flow

```
Splash → Welcome ─┬─ Sign In ─────────────────────────────→ MainTabs
                  └─ Start Driving → CreateAccount → VerifyOtp
                                                        ↓
     PersonalDetails → VehicleDetails → UploadDocuments → BankDetails → UnderReview
                                                                            ↓
                                                     Approved → MainTabs (reset)
                                                     Rejected → UploadDocuments
                                                     Suspended → support

Drive (online) → RideOffer ─┬─ Accept → NavigateToPickup → ArrivedAtPickup → TripInProgress
                            │                                                      ↓
                            └─ Decline / timeout → OfferLost         TripCompleted → RateRider
```

`Approved` and `RateRider` reset the stack, so neither onboarding nor a finished trip can be
swiped back into.

## Deliberate stand-ins

These are placeholders, not finished work. Each names what replaces it.

| Screen | Stand-in | Replace with |
|---|---|---|
| Drive | An offer fires 6s after going online | Dispatch offer over WebSocket (T10) |
| Drive | Duty toggle flips local state | `PUT /driver/duty-status` (T7) |
| RideOffer | 15s countdown starts locally | Server-issued offer expiry (T10) |
| NavigateToPickup | "Open navigation" just advances the screen | Handoff to the OS map app |
| ArrivedAtPickup | Any 4 digits start the trip | Server-issued pickup code (T11) |
| TripInProgress | Fare is static, progress ticks on a timer | Server-authoritative fare and telemetry (T11) |
| UploadDocuments | Tapping a row marks it uploaded | S3-compatible upload; `storage_key`, never a public URL (T7) |
| UnderReview | "Check status" jumps to Approved | Onboarding status poll (T7) |
| Earnings, Trips, Payouts | Values from `data/mock.ts` | `driver_earnings`, `driver_payouts` (T13) |

The driver's phone **displays** fare, it never **decides** it. That one is a rule, not a shortcut.

## Wiring it to the backend

Not yet — see [docs/21-Gap-Tasks.md](../docs/21-Gap-Tasks.md). The screens keep their shape and
gain a data layer beneath them. Two things to know when that happens:

- **Login needs an app context.** The API takes `{ email, password, app: "DRIVER" }` and returns a
  token scoped to that surface. See `AppContext` in the backend.
- **Registration needs a role.** `POST /auth/register` takes `{ email, password, role: "DRIVER" }`.

Add types generated from the backend's OpenAPI rather than hand-writing them.
