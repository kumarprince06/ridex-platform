/**
 * Nav glyphs.
 *
 * ponytail: a path lookup, not an icon package. Fifteen 16px outlines do not justify a dependency
 * that ships a thousand, and these inherit currentColor so the active and hover states are free.
 */
const PATHS: Record<string, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
  analytics: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  live: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z M12 10.5v.01',
  riders: 'M4 21a8 8 0 0 1 16 0 M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
  drivers: 'M3 16h18 M5 16l1.6-5A2 2 0 0 1 8.5 9.5h7A2 2 0 0 1 17.4 11L19 16 M6.5 19h1.5 M16 19h1.5',
  approvals: 'M20 6 9 17l-5-5',
  trips: 'M6 4v13 M6 21v.01 M18 3v.01 M18 7v13 M6 6h9a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h9',
  cases: 'M3 7h18v13H3z M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  payments: 'M2 7h20v12H2z M2 11h20',
  payouts: 'M12 3v14 M6 11l6 6 6-6 M4 21h16',
  pricing: 'M4 4h8l8 8-8 8-8-8z M8.5 8.5v.01',
  promotions: 'M3 9h18v11H3z M3 5h18v4H3z M12 5v15 M12 5S9.5 2 7.5 3.5 9 8 12 5z M12 5s2.5-3 4.5-1.5S15 8 12 5z',
  templates: 'M3 5h18v14H3z M3 9l9 5 9-5',
  flags: 'M5 21V4h13l-2.5 4L18 12H5',
  audit: 'M6 3h9l5 5v13H6z M14 3v6h6 M9 13h7 M9 17h5',
  staff: 'M8 21a6 6 0 0 1 12 0 M14 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M4 21a5 5 0 0 1 4-4.9',
};

export function NavIcon({ name }: { name: string }) {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
