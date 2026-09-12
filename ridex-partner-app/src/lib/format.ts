/**
 * How the driver's app writes numbers and times.
 *
 * Pure functions with no React and no API types in them, so a screen, a component and a test all
 * format a fare the same way - and there is one place to change when the rounding is wrong.
 */

/** Minor units to a display string. The currency comes from the response, never assumed. */
export function money(amountMinor: number, currency: string): string {
  const sign = amountMinor < 0 ? '-' : '';
  return `${sign}${currency} ${(Math.abs(amountMinor) / 100).toFixed(2)}`;
}

/** "7.8 km" - the only unit a driver reads mid-traffic. */
export function distance(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`;
}

/** "08:15", in the phone's own zone: the driver is standing in it. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** "19 min", never "0 min": a trip that rounds to nothing still took a minute. */
export function minutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
