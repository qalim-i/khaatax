// Date helpers shared by the dashboard/report hooks.
//
// Everything the API stores in a `date` column is a plain `YYYY-MM-DD` calendar
// day with no timezone. Deriving those strings via `toISOString().slice(0, 10)`
// is wrong for any timezone ahead of UTC — in IST, local midnight on the 1st
// serialises to the previous month's last day, so "this month" silently picks up
// an extra day. These helpers work off local calendar parts instead.

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfMonthIso(now: Date = new Date()): string {
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

export function startOfYearIso(now: Date = new Date()): string {
  return toIsoDate(new Date(now.getFullYear(), 0, 1));
}

/** First day of the month `monthsBack` months before `now`. */
export function startOfMonthsAgoIso(monthsBack: number, now: Date = new Date()): string {
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() - monthsBack, 1));
}

/** `YYYY-MM` bucket key, used to group rows into months. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Short label for a `YYYY-MM` key, e.g. "Aug 26". */
export function formatMonthKey(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
  return `${label} ${String(year).slice(2)}`;
}

/**
 * Whole days between an ISO calendar day and today, compared at UTC midnight so
 * neither DST nor the local offset can shift the result by a day. Never negative.
 */
export function daysSince(isoDate: string, now: Date = new Date()): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const then = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - then) / 86_400_000));
}
