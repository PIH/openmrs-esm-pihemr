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

/** The part of a react-aria date value `fromPickerRange` reads, whatever calendar it is in. */
interface PickerDate {
  toDate(timeZone: string): Date;
}

/**
 * The earliest year the picker accepts; it is the framework's floor for a date picker with no
 * `minDate`, which the picker flags as out of range but reports all the same.
 */
const EARLIEST_PICKER_YEAR = 1793;

/**
 * The range an `OpenmrsDateRangePicker` reports through `onChangeRaw`.
 *
 * Its `onChange` cannot be used: react-aria reports `null` until both ends of the range are
 * complete, which is on every keystroke while typing the first date, and the framework's `onChange`
 * reads `start` off that `null` and throws. An incomplete range is treated as no range at all.
 *
 * So is one the picker would reject. Once the first date is in, react-aria reports a complete range
 * on every keystroke of the last year typed, as years 2, 20 and 202 on the way to 2026, and those
 * are no more the range someone means than a half-typed one is.
 */
export function fromPickerRange(
  range: { start?: PickerDate | null; end?: PickerDate | null } | null | undefined,
): DateRange {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const start = range?.start?.toDate(timeZone);
  const end = range?.end?.toDate(timeZone);
  if (!start || !end || start > end || start.getFullYear() < EARLIEST_PICKER_YEAR) {
    return {};
  }
  return { fromDate: toDateKey(start), toDate: toDateKey(end) };
}

/**
 * What to seed an `OpenmrsDateRangePicker` with, as its `defaultValue`: nothing at all when no range
 * is set.
 *
 * The picker must be left uncontrolled. React-aria keeps a half-typed range to one side, and only
 * shows it while the picker's value is empty; the framework hands an empty `value` on as a range with
 * two empty ends rather than as no range, which hides it, so the day and month typed so far are
 * wiped the moment the year completes the first date. Remount the picker (with a `key`) to clear it.
 */
export function toPickerDefault(range: DateRange): [Date | null, Date | null] | undefined {
  return hasDateRange(range) ? [fromDateKey(range.fromDate), fromDateKey(range.toDate)] : undefined;
}

export function hasDateRange(range: DateRange): boolean {
  return Boolean(range.fromDate || range.toDate);
}

/**
 * What each pihapps audit endpoint calls its date bounds. Both take a separate range per column,
 * so a caller names the one it means: the obs streams bound the action each searched on, and the
 * provider view is asking when encounters happened, hence `encounterDatetime`.
 */
export const OBS_CREATED_DATE_PARAMS = { from: 'createdOnOrAfter', to: 'createdOnOrBefore' } as const;
export const OBS_VOIDED_DATE_PARAMS = { from: 'voidedOnOrAfter', to: 'voidedOnOrBefore' } as const;
export const ENCOUNTER_DATE_PARAMS = {
  from: 'encounterDatetimeOnOrAfter',
  to: 'encounterDatetimeOnOrBefore',
} as const;

interface DateParamNames {
  from: string;
  to: string;
}

/**
 * The date query one of those endpoints understands. `params` names its two bounds; there is no
 * default, since no two of them agree any more.
 *
 * Bare dates are sent deliberately: those endpoints read a date-only upper bound as the whole of
 * that day, so there is no need to spell out a time to avoid an inclusive bound matching only
 * midnight. They read both ends against whatever the search is about: the audit action where one is
 * named, and the encounter's own datetime for a provider search.
 */
export function buildAuditDateQuery(range: DateRange, params: DateParamNames): string {
  let query = '';
  if (range.fromDate) {
    query += `&${params.from}=${range.fromDate}`;
  }
  if (range.toDate) {
    query += `&${params.to}=${range.toDate}`;
  }
  return query;
}
