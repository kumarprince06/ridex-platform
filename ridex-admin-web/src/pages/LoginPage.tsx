import { FormEvent, useState } from 'react';

import { ApiError } from '../api/problem';
import { useSession } from '../auth/session';
import './login.css';

export function LoginPage() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <span className="brand-mark">RX</span>
          <span>
            RideX <strong>Console</strong>
          </span>
        </div>

        <h1 className="login-title">Sign in to operations</h1>
        <p className="login-sub">
          Staff accounts only. Riders and drivers cannot reach this surface, and the token is
          granted only the roles this account actually holds.
        </p>

        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="field-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="field-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="login-error">{error}</p> : null}

        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
