const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DAY_CHOICES = DAYS.map((label, index) => ({ label, value: String(index + 1) }));

export function dayNames(daysOfWeek: string): string {
  // The two everyday cases named rather than listed, because "Mon–Fri" is what operations says.
  if (daysOfWeek === '1,2,3,4,5') return 'Weekdays';
  if (daysOfWeek === '1,2,3,4,5,6,7') return 'Every day';
  return daysOfWeek.split(',').map((day) => DAYS[Number(day) - 1] ?? day).join(', ');
}

/**
 * Every leg of a route priced by one rule: a base fare plus so much per stop travelled. Nine
 * stops are thirty-six legs, and nobody should type thirty-six numbers to open a route.
 */
export function legsFromRule(
  stopIds: string[],
  baseRupees: number,
  perStopRupees: number,
): { fromStopId: string; toStopId: string; fareMinor: number }[] {
  const legs = [];
  for (let from = 0; from < stopIds.length; from++) {
    for (let to = from + 1; to < stopIds.length; to++) {
      legs.push({
        fromStopId: stopIds[from],
        toStopId: stopIds[to],
        fareMinor: Math.round((baseRupees + perStopRupees * (to - from - 1)) * 100),
      });
    }
  }
  return legs;
}

/** A readable route code from its name: "Bally Halt to Sector V" becomes BALLY_SECTOR. */
export function codeFrom(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter((word) => word && word !== 'TO');
  return [words[0], words[words.length - 1]].filter(Boolean).join('_').slice(0, 20);
}
