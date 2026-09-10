import { buildAuditDateQuery, fromDateKey, hasDateRange, toDateKey } from './date-range';

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

describe('hasDateRange', () => {
  it('knows when either end is set', () => {
    expect(hasDateRange({})).toBe(false);
    expect(hasDateRange({ fromDate: '2026-09-01' })).toBe(true);
    expect(hasDateRange({ toDate: '2026-09-30' })).toBe(true);
  });
});

describe('buildAuditDateQuery', () => {
  it('sends nothing when no range is set', () => {
    expect(buildAuditDateQuery({})).toBe('');
  });

  /**
   * Bare dates on purpose: the pihcore endpoint reads a date-only endDate as the whole of that day,
   * so spelling out a time would only risk disagreeing with it.
   */
  it('sends the range as plain calendar dates', () => {
    expect(buildAuditDateQuery({ fromDate: '2026-09-01', toDate: '2026-09-30' })).toBe(
      '&startDate=2026-09-01&endDate=2026-09-30',
    );
  });

  it('sends whichever end is set on its own', () => {
    expect(buildAuditDateQuery({ fromDate: '2026-09-01' })).toBe('&startDate=2026-09-01');
    expect(buildAuditDateQuery({ toDate: '2026-09-30' })).toBe('&endDate=2026-09-30');
  });
});
