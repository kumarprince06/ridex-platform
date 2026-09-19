import { FormEvent, useState } from 'react';

import { ApiError } from '../api/problem';
import { useSession } from '../auth/session';
import { Logo } from '../components/Logo';
import './login.css';

export function LoginPage() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (caught) {
      // "This account does not have administrative access" arrives here for a rider or driver
      // who found the console URL. The server decides the wording; it knows what is safe to say.
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <aside className="login-hero" aria-hidden="true">
        <CityRoute />

        <div className="login-hero-top">
          <Logo size={36} subtitle="Console" />
        </div>

        <div className="login-chip chip-a">
          <span className="chip-dot live" />
          <span>
            <strong>Shuttle on route</strong>
            <em>Bally → Ecospace · on time</em>
          </span>
        </div>
        <div className="login-chip chip-b">
          <span className="chip-figure">32/40</span>
          <span>
            <strong>Seats sold</strong>
            <em>08:30 departure</em>
          </span>
        </div>
        <div className="login-chip chip-c">
          <span className="chip-dot" />
          <span>
            <strong>Pass bought</strong>
            <em>Monthly · 26 rides</em>
          </span>
        </div>

        <div className="login-hero-bottom">
          <h2 className="login-hero-title">Every ride and shuttle in the city, on one screen.</h2>
          <p className="login-hero-text">Live map, routes and timetables, fares and passes, payments and payouts, with every change in the audit log.</p>
          <p className="login-hero-foot">RideX Transport Solution · Kolkata</p>
        </div>
      </aside>

      <main className="login-side">
        <form className="login-card" onSubmit={onSubmit}>
          <div className="login-brand">
            <Logo size={40} subtitle="Console" plate />
          </div>

          <span className="login-eyebrow">Staff sign-in</span>
          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">Use your staff account. Riders and drivers sign in from the apps.</p>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="field-input"
              type="email"
              autoComplete="username"
              placeholder="you@ridex.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <span className="password-wrap">
              <input
                className="field-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>

          {error ? <p className="login-error" role="alert">{error}</p> : null}

          <button className="login-submit" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
            {busy ? null : <span aria-hidden="true">→</span>}
          </button>

          <p className="login-note">
            <span className="login-lock" aria-hidden="true" />
            Staff only. Every sign-in and change is recorded in the audit log.
          </p>
        </form>
      </main>
    </div>
  );
}

/** A made-up street grid with one route across it; the shuttle rides it on a loop. */
function CityRoute() {
  const route = 'M -20 470 C 80 450, 120 360, 210 350 S 330 400, 390 300 S 470 150, 560 170 S 700 120, 760 60';
  return (
    <svg className="login-map" viewBox="0 0 720 560" preserveAspectRatio="xMidYMid slice">
      <g className="map-streets">
        <path d="M 0 120 L 720 90 M 0 250 L 720 230 M 0 390 L 720 400 M 0 520 L 720 500" />
        <path d="M 90 0 L 130 560 M 250 0 L 230 560 M 420 0 L 450 560 M 600 0 L 580 560" />
        <path className="minor" d="M 0 185 L 720 160 M 0 320 L 720 315 M 0 455 L 720 450 M 170 0 L 180 560 M 340 0 L 335 560 M 510 0 L 520 560 M 680 0 L 660 560" />
      </g>
      <path className="map-river" d="M -20 20 C 120 60, 160 140, 110 220 S 60 380, 20 560" />
      <path className="map-route-glow" d={route} />
      <path className="map-route" d={route} />
      {[
        [210, 350],
        [390, 300],
        [560, 170],
      ].map(([x, y]) => (
        <g key={x} className="map-stop">
          <circle cx={x} cy={y} r="11" />
          <circle cx={x} cy={y} r="5" />
        </g>
      ))}
      <g className="map-shuttle">
        <circle r="16" className="halo" />
        <circle r="8" />
        <animateMotion dur="14s" repeatCount="indefinite" path={route} rotate="auto" />
      </g>
    </svg>
  );
}
