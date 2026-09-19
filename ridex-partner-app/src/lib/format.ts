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

/**
 * The ledger balance in words. Negative means the driver kept cash that includes the platform's
 * fee, so "-INR 77 owed to you" would say the opposite of what is true.
 */
export function balance(balanceMinor: number, currency: string): { amount: string; label: string; owing: boolean } {
  const owing = balanceMinor < 0;
  return { amount: money(Math.abs(balanceMinor), currency), label: owing ? 'You owe' : 'Owed to you', owing };
}

/** "7.8 km" - the only unit a driver reads mid-traffic. */
export function distance(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`;
}

/** "08:15", in the phone's own zone: the driver is standing in it. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Yesterday, today and tomorrow get named, because "Today, 2:30 PM" is what the rider is actually
 * scanning for in a list. Anything else - past rides or a booked seat next week - is just a date.
 */
export function when(at: string | Date): string {
  const moment = asDate(at);
  const time = clockTime(moment);

  const day = new Date(moment);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Rounded, so a DST shift can't turn a whole day into 0.96 of one.
  const offset = Math.round((day.getTime() - today.getTime()) / 86_400_000);

  if (offset === 0) return `Today, ${time}`;
  if (offset === 1) return `Tomorrow, ${time}`;
  if (offset === -1) return `Yesterday, ${time}`;
  return `${moment.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}

/** "19 min", never "0 min": a trip that rounds to nothing still took a minute. */
export function minutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
