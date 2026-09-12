/**
 * How the rider's app writes numbers, distances and times.
 *
 * Pure functions with no React and no API types in them, so a screen, a sheet and a receipt all
 * format a fare the same way - and there is one place to change when the rounding is wrong.
 */

/** Minor units to a display string. The currency comes from the response, never assumed. */
export function money(amountMinor: number, currency: string): string {
  const sign = amountMinor < 0 ? '-' : '';
  return `${sign}${currency} ${(Math.abs(amountMinor) / 100).toFixed(2)}`;
}

/** "7.8 km". One decimal: a rider reading a fare does not care about metres. */
export function distance(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`;
}

/** "19 min", never "0 min": a trip that rounds to nothing still took a minute. */
export function minutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** "2:30 PM", in the phone's own zone - the rider is standing in it. */
export function clockTime(at: string | Date): string {
  return asDate(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "Fri, 12 Sep" - a departure a rider is matching against their own week. */
export function shortDate(at: string | Date): string {
  return asDate(at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Today and yesterday get named, because "Today, 2:30 PM" is what the rider is actually scanning
 * for in a list. Anything older is just a date.
 */
export function when(at: string | Date): string {
  const moment = asDate(at);
  const time = clockTime(moment);

  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const daysAgo = Math.floor((midnight.getTime() - moment.getTime()) / 86_400_000) + 1;

  if (daysAgo <= 0) return `Today, ${time}`;
  if (daysAgo === 1) return `Yesterday, ${time}`;
  return `${moment.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}

function asDate(at: string | Date): Date {
  return at instanceof Date ? at : new Date(at);
}
