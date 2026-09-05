import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Permission } from '../auth/permissions';
import { ROLE_LABELS } from '../auth/permissions';
import { Logo } from './Logo';
import { NavIcon } from './NavIcon';
import { useSession } from '../auth/session';
import './shell.css';

type NavItem = {
  to: string;
  label: string;
  /** Key into the glyph table. */
  icon: string;
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
      { to: '/', label: 'Dashboard', icon: 'dashboard' },
      { to: '/analytics', label: 'Analytics', icon: 'analytics', permission: 'OPERATIONS' },
      { to: '/live', label: 'Live map', icon: 'live', permission: 'OPERATIONS' },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/riders', label: 'Riders', icon: 'riders' },
      { to: '/drivers', label: 'Drivers', icon: 'drivers' },
      { to: '/approvals', label: 'Driver approvals', icon: 'approvals', permission: 'OPERATIONS' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/trips', label: 'Trips', icon: 'trips' },
      { to: '/cases', label: 'Support cases', icon: 'cases', permission: 'SUPPORT_CASE' },
    ],
  },
  {
    title: 'Money',
    items: [
      { to: '/payments', label: 'Payments', icon: 'payments', permission: 'FINANCE' },
      { to: '/payouts', label: 'Payouts', icon: 'payouts', permission: 'FINANCE' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { to: '/pricing', label: 'Pricing and ride types', icon: 'pricing', permission: 'OPERATIONS' },
      { to: '/promotions', label: 'Promotions', icon: 'promotions', permission: 'OPERATIONS' },
      { to: '/templates', label: 'Notification templates', icon: 'templates', permission: 'SUPER_ADMIN' },
      { to: '/flags', label: 'Feature flags', icon: 'flags', permission: 'SUPER_ADMIN' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { to: '/audit', label: 'Audit log', icon: 'audit', permission: 'OPERATIONS' },
      { to: '/staff', label: 'Staff and roles', icon: 'staff', permission: 'SUPER_ADMIN' },
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
                  <NavIcon name={item.icon} />
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
