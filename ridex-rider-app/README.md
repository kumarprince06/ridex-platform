# RideX Rider App

React Native (Expo) rider-facing app. **Static UI only** — no network calls, no backend wiring.
Every screen holds local state and navigates on tap.

## Running

```bash
cd ridex-rider-app
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

Expo **SDK 54** and React Native **0.81.5**, which need Node 20+. `.nvmrc` pins Node 22 — the
system Node on this machine is 18, and Metro fails on it with `configs.toReversed is not a
function`, so run through nvm.

`ridex-partner-app` is pinned to the same versions. Both apps upgrade together: a shared design
system spread across two SDK versions drifts within a release.

## Layout

```
App.tsx                  font loading, providers, status bar
src/
├── theme.ts             all colours, spacing, radii and type scale
├── navigation/
│   ├── types.ts         route map and params
│   ├── RootNavigator.tsx
│   └── MainTabs.tsx     Home · Rides · Wallet · Profile
├── components/          Button, TextField, Screen, MapCanvas, StepProgress
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
| ProfileSetup | Avatar is initials, camera chip is inert | `expo-image-picker` plus object storage |
| PersonalDetails | Date of birth is a text field | `@react-native-community/datetimepicker` |
| SignIn | Google and Apple buttons are inert | OAuth, if it stays in scope |
| VerifyOtp | Countdown starts at 42s and resets locally | Server-issued expiry |
| Home, booking flow | Map renders real Google Maps, but pins and routes are fixed coordinates | Live location and server routes (T8) |

## Wiring it to the backend

Not yet. When the backend reaches roughly half of `docs/21-Gap-Tasks.md`, the screens keep their
shape and gain a data layer beneath them. Two things to know when that happens:

- **Login needs an app context.** The API takes `{ email, password, app: "RIDER" }` and returns a
  token scoped to that surface. See `AppContext` in the backend.
- **Registration needs a role.** `POST /auth/register` takes `{ email, password, role: "RIDER" }`.

Add types generated from the backend's OpenAPI rather than hand-writing them.

## Dependency advisories

`npm audit` reports advisories that all originate in **Expo's build tooling** — Metro, the Expo
CLI, and the iOS project writers. None of them ship in the app binary or run on a user's device.

Two are fixed here with `overrides`, both patch bumps inside their own major:

| Package | Was | Now | Severity |
|---|---|---|---|
| `postcss` (via Metro) | 8.4.49 | 8.5.28 | high |
| `@xmldom/xmldom` (via `@expo/plist`, `plist`) | 0.8.14 / 0.9.11 | 0.8.15 / 0.9.12 | moderate |

Three are left alone, deliberately:

| Package | Why not |
|---|---|
| `image-size` (via `metro`) | **No fixed version exists.** The latest release, 2.0.2, is itself in the vulnerable range |
| `uuid@7` (via `xcode`) | The fix needs uuid ≥ 11 — four majors up, and v9 removed the default export that `xcode` calls. Overriding it breaks iOS builds to patch a build-time DoS |
| `decode-uri-component` (via `query-string`, Expo CLI) | Fix requires 0.5.0 against 0.2.2 installed; on a 0.x package that is a breaking change |

The real fix for all three is the Expo SDK 54 → 57 upgrade, which is a deliberate piece of work
with device testing on both apps together — not something to do through a dependency patch.

**Before merging a Dependabot PR here, check it against this table.** An automated bump of `uuid`
or `image-size` will either break the build or change nothing.
