# RideX Rider App

React Native (Expo) rider-facing app. **Static UI only** — no network calls, no backend wiring.
Every screen holds local state and navigates on tap.

## Running

```bash
cd ridex-rider-app
npm install
npx expo start
```

Scan the QR with **Expo Go** on your phone. No Android Studio or Xcode needed.

Press `a` for an Android emulator or `i` for an iOS simulator if you have them installed.

```bash
npm run typecheck    # tsc --noEmit
```

## Pinning

Expo **SDK 51** and React Native **0.74.5**, chosen because the project runs on Node 18.19.1.
SDK 54 and newer require Node 20+. If you upgrade Node, upgrade the SDK in the same change —
mixing a new Node with an old SDK is fine, but the reverse is not.

## Layout

```
App.tsx                  font loading, providers, status bar
src/
├── theme.ts             all colours, spacing, radii and type scale
├── navigation/
│   ├── types.ts         route map and params
│   └── RootNavigator.tsx
├── components/          Button, TextField, Screen, StepProgress
└── screens/             one file per screen
```

`src/theme.ts` is the single source for design values. A screen that hardcodes a hex has drifted
from the design — fix the token, not the screen.

## Flow

```
Welcome ─┬─ Get Started ──→ SignIn ──→ Home
         └─ Create Account ─→ CreateAccount → VerifyOtp → Verified
                                                             ↓
                              ProfileSetup → PersonalDetails → SaveLocations → Home

SignIn ── Forgot password ──→ ForgotPassword → CheckInbox → NewPassword → SignIn
```

`SaveLocations` resets the stack on finish, so the setup flow cannot be swiped back into.

## Deliberate stand-ins

These are placeholders, not finished work. Each names what replaces it.

| Screen | Stand-in | Replace with |
|---|---|---|
| Welcome | Gradient behind the hero | `ImageBackground` once the city photograph exists |
| Home | Ruled grid as the map | `react-native-maps` in the location phase |
| Home | Bottom tab bar is presentational | A real tab navigator once Rides/Wallet/Profile exist |
| ProfileSetup | Avatar is initials, camera chip is inert | `expo-image-picker` plus object storage |
| PersonalDetails | Date of birth is a text field | `@react-native-community/datetimepicker` |
| SignIn | Google and Apple buttons are inert | OAuth, if it stays in scope |
| VerifyOtp | Countdown starts at 42s and resets locally | Server-issued expiry |

## Wiring it to the backend

Not yet. When the backend reaches roughly half of `docs/21-Gap-Tasks.md`, the screens keep their
shape and gain a data layer beneath them. Two things to know when that happens:

- **Login needs an app context.** The API takes `{ email, password, app: "RIDER" }` and returns a
  token scoped to that surface. See `AppContext` in the backend.
- **Registration needs a role.** `POST /auth/register` takes `{ email, password, role: "RIDER" }`.

Add types generated from the backend's OpenAPI rather than hand-writing them.
