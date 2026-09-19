import { FormEvent, useState } from 'react';

import { ApiError } from '../api/problem';
import { useSession } from '../auth/session';
import { Logo, LogoMark } from '../components/Logo';
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
        <div className="login-hero-mark">
          <LogoMark size={56} />
        </div>
        <h2 className="login-hero-title">
          Every ride and shuttle in the city,
          <br />
          on one screen.
        </h2>
        <ul className="login-hero-points">
          <li>
            <span className="login-dot" />
            Live map of drivers and running shuttles
          </li>
          <li>
            <span className="login-dot" />
            Routes, timetables, fares and passes
          </li>
          <li>
            <span className="login-dot" />
            Payments, payouts and a full audit trail
          </li>
        </ul>
        <p className="login-hero-foot">RideX Transport Solution · Kolkata</p>
      </aside>

      <main className="login-side">
        <form className="login-card" onSubmit={onSubmit}>
          <div className="login-brand">
            <Logo size={40} subtitle="Console" plate />
          </div>

          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">Sign in with your staff account. Riders and drivers use the apps.</p>

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

          {error ? <p className="login-error">{error}</p> : null}

          <button className="login-submit" type="submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  );
}
