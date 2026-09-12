/**
 * How the console writes numbers and times.
 *
 * Pure functions, no React and no API types: a table cell, a stat tile and a page header all
 * format a date the same way, and there is one place to change when they should not.
 */

/** Minor units to a display string. The currency comes from the response, never assumed. */
export function money(amountMinor: number, currency: string): string {
  const sign = amountMinor < 0 ? '-' : '';
  return `${sign}${currency} ${(Math.abs(amountMinor) / 100).toFixed(2)}`;
}

/** Date and time in the operator's own zone - they are reconciling against a clock on the wall. */
export function dateTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : '--';
}

export function date(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString() : '--';
}

export function clockTime(iso: string | null | undefined): string {
  return iso
    ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--';
}

/** "7.8 km", or "--" when nothing was measured. */
export function distance(metres: number | null | undefined): string {
  return metres == null ? '--' : `${(metres / 1000).toFixed(1)} km`;
}
