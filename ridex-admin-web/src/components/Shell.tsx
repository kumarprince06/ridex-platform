import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Permission } from '../auth/permissions';
import { ROLE_LABELS } from '../auth/permissions';
import { Logo } from './Logo';
import { NavIcon } from './NavIcon';
import { useSession } from '../auth/session';
import './shell.css';

type Tab = {
  to: string;
  label: string;
  /** Absent means everyone signed in may see it. */
  permission?: Permission;
};

/** One sidebar entry; its tabs are the pages inside it, shown across the top of each one. */
type Section = { label: string; icon: string; tabs: Tab[] };

/**
 * The navigation is the permission model made visible. An item the user cannot use is not rendered
 * disabled - it is not rendered at all, and its route refuses directly-typed URLs. A greyed-out
 * "Refund" tells an agent precisely what to talk someone into granting them.
 */
const SECTIONS: Section[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    tabs: [
      { to: '/', label: 'Overview' },
      { to: '/analytics', label: 'Analytics', permission: 'OPERATIONS' },
    ],
  },
  { label: 'Live map', icon: 'live', tabs: [{ to: '/live', label: 'Live map', permission: 'OPERATIONS' }] },
  { label: 'Rides', icon: 'trips', tabs: [{ to: '/trips', label: 'Rides' }] },
  {
    label: 'Shuttle',
    icon: 'shuttle',
    tabs: [
      { to: '/shuttle/departures', label: 'Today', permission: 'OPERATIONS' },
      { to: '/shuttle', label: 'Routes', permission: 'OPERATIONS' },
    ],
  },
  {
    label: 'People',
    icon: 'riders',
    tabs: [
      { to: '/riders', label: 'Riders' },
      { to: '/drivers', label: 'Drivers' },
      { to: '/approvals', label: 'Driver approvals', permission: 'OPERATIONS' },
    ],
  },
  {
    label: 'Money',
    icon: 'payments',
    tabs: [
      { to: '/payments', label: 'Payments', permission: 'FINANCE' },
      { to: '/payouts', label: 'Payouts', permission: 'FINANCE' },
    ],
  },
  { label: 'Support', icon: 'cases', tabs: [{ to: '/cases', label: 'Support', permission: 'SUPPORT_CASE' }] },
  {
    label: 'Settings',
    icon: 'settings',
    tabs: [
      { to: '/pricing', label: 'Fares & fees', permission: 'OPERATIONS' },
      { to: '/legal', label: 'App content', permission: 'OPERATIONS' },
      { to: '/staff', label: 'Staff', permission: 'SUPER_ADMIN' },
    ],
  },
  { label: 'Audit log', icon: 'audit', tabs: [{ to: '/audit', label: 'Audit log', permission: 'SUPER_ADMIN' }] },
];

/** Which tab a URL belongs to: the longest matching prefix, so /shuttle/departures is not /shuttle. */
function tabFor(pathname: string, tabs: Tab[]): Tab | undefined {
  return tabs
    .filter((tab) => (tab.to === '/' ? pathname === '/' : pathname === tab.to || pathname.startsWith(tab.to + '/')))
    .sort((a, b) => b.to.length - a.to.length)[0];
}

export function Shell() {
  const { session, can, signOut } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!session) {
    return null;
  }

  const sections = SECTIONS.map((section) => ({
    ...section,
    tabs: section.tabs.filter((tab) => !tab.permission || can(tab.permission)),
  })).filter((section) => section.tabs.length > 0);
  const allTabs = sections.flatMap((section) => section.tabs);
  const currentTab = tabFor(pathname, allTabs);
  const current = sections.find((section) => currentTab && section.tabs.includes(currentTab));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo subtitle="Console" />
        </div>

        <nav>
          {sections.map((section) => (
            <NavLink
              key={section.label}
              to={section.tabs[0].to}
              className={section === current ? 'nav-link active' : 'nav-link'}
            >
              <NavIcon name={section.icon} />
              {section.label}
            </NavLink>
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
          {current && current.tabs.length > 1 ? (
            <nav className="section-tabs" aria-label={current.label}>
              {current.tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={tab === currentTab ? 'section-tab active' : 'section-tab'}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
