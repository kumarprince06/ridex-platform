import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSIONS, StaffRole } from '../auth/permissions';
import { useSession } from '../auth/session';
import './login.css';

const ROLES: StaffRole[] = ['SUPPORT', 'OPS_ADMIN', 'FINANCE', 'SUPER_ADMIN'];

/**
 * The role picker is the static build's stand-in for `POST /auth/login` with `app: "ADMIN"`.
 * It exists so every permission path is walkable from day one - the fastest way to ship a console
 * where FINANCE-only screens have never been seen is to develop the whole thing as a super admin.
 */
export function LoginPage() {
  const { signIn } = useSession();

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">RX</span>
          <span>
            RideX <strong>Console</strong>
          </span>
        </div>

        <h1 className="login-title">Sign in to operations</h1>
        <p className="login-sub">
          Static build: pick the role to sign in as. In production this is an email and password
          against the ADMIN app context, and permissions arrive on the token.
        </p>

        <div className="role-list">
          {ROLES.map((role) => (
            <button key={role} className="role" type="button" onClick={() => signIn(role)}>
              <span className="role-head">
                <span className="role-name">{ROLE_LABELS[role]}</span>
                <span className="role-count">{ROLE_PERMISSIONS[role].length} permissions</span>
              </span>
              <span className="role-desc">{ROLE_DESCRIPTIONS[role]}</span>
              <span className="role-perms">{ROLE_PERMISSIONS[role].join(' · ')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
