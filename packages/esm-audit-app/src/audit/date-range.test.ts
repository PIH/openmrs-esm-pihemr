import {
  buildAuditDateQuery,
  ENCOUNTER_DATE_PARAMS,
  fromDateKey,
  fromPickerRange,
  toPickerDefault,
  hasDateRange,
  OBS_CREATED_DATE_PARAMS,
  OBS_VOIDED_DATE_PARAMS,
  toDateKey,
} from './date-range';

describe('date keys', () => {
  it('reads the calendar date a moment falls on', () => {
    expect(toDateKey(new Date(2026, 8, 10, 14, 30))).toBe('2026-09-10');
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('has nothing to say about a missing or unparseable date', () => {
    expect(toDateKey(null)).toBeUndefined();
    expect(toDateKey(undefined)).toBeUndefined();
    expect(toDateKey(new Date('nonsense'))).toBeUndefined();
  });

  it('round-trips back to local midnight, not to UTC midnight', () => {
    const date = fromDateKey('2026-09-10');

    expect(date?.getHours()).toBe(0);
    expect(toDateKey(date)).toBe('2026-09-10');
  });

  it('has nothing to round-trip when no date is set', () => {
    expect(fromDateKey(undefined)).toBeNull();
    expect(fromDateKey('')).toBeNull();
  });
});

describe('fromPickerRange', () => {
  // `new Date` would read a year below 100 as 19xx, where react-aria's `toDate` keeps it as typed
  const pickerDate = (year: number, month: number, day: number) => ({
    toDate: () => {
      const date = new Date(2000, month - 1, day);
      date.setFullYear(year);
      return date;
    },
  });

  it('reads a complete range as calendar dates', () => {
    expect(fromPickerRange({ start: pickerDate(2026, 9, 1), end: pickerDate(2026, 9, 30) })).toEqual({
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
    });
  });

  /** What the picker reports on every keystroke until both ends of the range are complete. */
  it('reads an incomplete range as no range at all', () => {
    expect(hasDateRange(fromPickerRange(null))).toBe(false);
    expect(hasDateRange(fromPickerRange(undefined))).toBe(false);
  });

  /** What the picker reports on the way to typing a year, as 2 and then 20 on the way to 2026. */
  it('reads a range the picker would reject as no range at all', () => {
    expect(hasDateRange(fromPickerRange({ start: pickerDate(2026, 9, 1), end: pickerDate(20, 9, 30) }))).toBe(false);
    expect(hasDateRange(fromPickerRange({ start: pickerDate(20, 9, 1), end: pickerDate(2026, 9, 30) }))).toBe(false);
  });
});

describe('toPickerDefault', () => {
  it('seeds the picker with a range that is set', () => {
    expect(toPickerDefault({ fromDate: '2026-09-01', toDate: '2026-09-30' })).toEqual([
      new Date(2026, 8, 1),
      new Date(2026, 8, 30),
    ]);
  });

  /** An empty value hides what react-aria holds of a half-typed range; see `toPickerDefault`. */
  it('leaves the picker empty rather than holding an empty range', () => {
    expect(toPickerDefault({})).toBeUndefined();
  });
});

describe('hasDateRange', () => {
  it('knows when either end is set', () => {
    expect(hasDateRange({})).toBe(false);
    expect(hasDateRange({ fromDate: '2026-09-01' })).toBe(true);
    expect(hasDateRange({ toDate: '2026-09-30' })).toBe(true);
  });
});

describe('buildAuditDateQuery', () => {
  it('sends nothing when no range is set', () => {
    expect(buildAuditDateQuery({}, OBS_CREATED_DATE_PARAMS)).toBe('');
  });

  /**
   * Bare dates on purpose: the pihapps endpoints read a date-only upper bound as the whole of that day,
   * so spelling out a time would only risk disagreeing with it.
   */
  it('sends the range as plain calendar dates', () => {
    expect(buildAuditDateQuery({ fromDate: '2026-09-01', toDate: '2026-09-30' }, OBS_CREATED_DATE_PARAMS)).toBe(
      '&createdOnOrAfter=2026-09-01&createdOnOrBefore=2026-09-30',
    );
  });

  it('sends whichever end is set on its own', () => {
    expect(buildAuditDateQuery({ fromDate: '2026-09-01' }, OBS_CREATED_DATE_PARAMS)).toBe(
      '&createdOnOrAfter=2026-09-01',
    );
    expect(buildAuditDateQuery({ toDate: '2026-09-30' }, OBS_CREATED_DATE_PARAMS)).toBe(
      '&createdOnOrBefore=2026-09-30',
    );
  });

  /** Each stream of an obs audit bounds the column it searched on, so they differ from each other. */
  it('names the bounds the way the voided obs stream does when asked to', () => {
    expect(buildAuditDateQuery({ fromDate: '2026-09-01', toDate: '2026-09-30' }, OBS_VOIDED_DATE_PARAMS)).toBe(
      '&voidedOnOrAfter=2026-09-01&voidedOnOrBefore=2026-09-30',
    );
  });

  /** No two endpoints agree on what the bounds are called, hence the parameter. */
  it('names the bounds the way the encounter endpoint does when asked to', () => {
    expect(buildAuditDateQuery({ fromDate: '2026-09-01', toDate: '2026-09-30' }, ENCOUNTER_DATE_PARAMS)).toBe(
      '&encounterDatetimeOnOrAfter=2026-09-01&encounterDatetimeOnOrBefore=2026-09-30',
    );
    expect(buildAuditDateQuery({}, ENCOUNTER_DATE_PARAMS)).toBe('');
  });
});
