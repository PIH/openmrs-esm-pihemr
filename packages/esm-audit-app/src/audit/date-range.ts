/**
 * A range of calendar dates, held as `YYYY-MM-DD` rather than as instants because that is what
 * someone picking a date means. Both ends are inclusive.
 */
export interface DateRange {
  fromDate?: string;
  toDate?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The calendar date a `Date` falls on, in the browser's time zone. */
export function toDateKey(date: Date | null | undefined): string | undefined {
  if (!date || Number.isNaN(date.getTime())) {
    return undefined;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight on a calendar date, for handing a stored range back to a date picker. */
export function fromDateKey(key: string | undefined): Date | null {
  if (!key) {
    return null;
  }
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function hasDateRange(range: DateRange): boolean {
  return Boolean(range.fromDate || range.toDate);
}

/**
 * The date parameters the pihcore audit endpoints understand — the same names on both, which is why
 * this is not specific to either.
 *
 * Bare dates are sent deliberately: those endpoints read a date-only `endDate` as the whole of that
 * day, so there is no need to spell out a time to avoid an inclusive bound matching only midnight.
 * They read both ends against whatever the search is about: the audit action where one is named,
 * and the encounter's own datetime for a provider search.
 */
export function buildAuditDateQuery(range: DateRange): string {
  let query = '';
  if (range.fromDate) {
    query += `&startDate=${range.fromDate}`;
  }
  if (range.toDate) {
    query += `&endDate=${range.toDate}`;
  }
  return query;
}
