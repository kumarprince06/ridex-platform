import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Permission } from '../auth/permissions';
import { ROLE_LABELS } from '../auth/permissions';
import { Logo } from './Logo';
import { useSession } from '../auth/session';
import './shell.css';

type NavItem = {
  to: string;
  label: string;
  /** Absent means everyone signed in may see it. */
  permission?: Permission;
};

type NavGroup = { title: string; items: NavItem[] };

/**
 * The navigation is the permission model made visible. An item the user cannot use is not rendered
 * disabled - it is not rendered at all, and its route refuses directly-typed URLs. A greyed-out
 * "Refund" tells an agent precisely what to talk someone into granting them.
 */
const NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard' },
      { to: '/analytics', label: 'Analytics', permission: 'OPERATIONS' },
      { to: '/live', label: 'Live map', permission: 'OPERATIONS' },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/riders', label: 'Riders' },
      { to: '/drivers', label: 'Drivers' },
      { to: '/approvals', label: 'Driver approvals', permission: 'OPERATIONS' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/trips', label: 'Trips' },
      { to: '/cases', label: 'Support cases', permission: 'SUPPORT_CASE' },
    ],
  },
  {
    title: 'Money',
    items: [
      { to: '/payments', label: 'Payments', permission: 'FINANCE' },
      { to: '/payouts', label: 'Payouts', permission: 'FINANCE' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { to: '/pricing', label: 'Pricing and ride types', permission: 'OPERATIONS' },
      { to: '/promotions', label: 'Promotions', permission: 'OPERATIONS' },
      { to: '/templates', label: 'Notification templates', permission: 'SUPER_ADMIN' },
      { to: '/flags', label: 'Feature flags', permission: 'SUPER_ADMIN' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { to: '/audit', label: 'Audit log', permission: 'OPERATIONS' },
      { to: '/staff', label: 'Staff and roles', permission: 'SUPER_ADMIN' },
    ],
  },
];

export function Shell() {
  const { session, can, signOut } = useSession();
  const navigate = useNavigate();

  if (!session) {
    return null;
  }

  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo subtitle="Console" />
        </div>

        <nav>
          {groups.map((group) => (
            <div className="nav-group" key={group.title}>
              <span className="nav-title">{group.title}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <input
            className="global-search"
            type="search"
            placeholder="Search a rider, driver, trip or case ID…"
            aria-label="Global search"
            onKeyDown={(event) => {
              // Operations arrives knowing an ID, never a page number.
              if (event.key === 'Enter') {
                navigate('/trips');
              }
            }}
          />

          <div className="identity">
            <span className="identity-avatar" aria-hidden="true">
              {session.email.slice(0, 2)}
            </span>
            <div className="identity-text">
              <span className="identity-name">{session.email}</span>
              <span className="identity-role">
                {session.roles.map((role) => ROLE_LABELS[role]).join(' · ')}
              </span>
            </div>
            <button className="signout" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
