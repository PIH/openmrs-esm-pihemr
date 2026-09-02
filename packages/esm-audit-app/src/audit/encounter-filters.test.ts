import { type AuditEncounter } from '../types';
import {
  buildEncounterFilterQuery,
  distinctEncounterTypes,
  fromDateKey,
  hasActiveFilters,
  matchesEncounterFilters,
  toDateKey,
} from './encounter-filters';

const consultationType = { uuid: 'type-consultation', display: 'Oncology Consultation' };
const checkinType = { uuid: 'type-checkin', display: 'Inscription' };

const consultation: AuditEncounter = {
  uuid: 'enc-1',
  encounterDatetime: '2026-04-18T09:00:00.000+0000',
  encounterType: consultationType,
};

describe('date keys', () => {
  it('reads the calendar date a moment falls on', () => {
    expect(toDateKey(new Date(2026, 3, 18, 9, 0))).toBe('2026-04-18');
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('has nothing to say about a missing or unparseable date', () => {
    expect(toDateKey(null)).toBeUndefined();
    expect(toDateKey(undefined)).toBeUndefined();
    expect(toDateKey(new Date('nonsense'))).toBeUndefined();
  });

  it('round-trips back to local midnight, not to UTC midnight', () => {
    const date = fromDateKey('2026-04-18');

    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(3);
    expect(date?.getDate()).toBe(18);
    expect(date?.getHours()).toBe(0);
    expect(toDateKey(date)).toBe('2026-04-18');
  });

  it('has nothing to round-trip when no date is set', () => {
    expect(fromDateKey(undefined)).toBeNull();
    expect(fromDateKey('')).toBeNull();
  });
});

describe('hasActiveFilters', () => {
  it('knows when a filter is set', () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ encounterType: consultationType })).toBe(true);
    expect(hasActiveFilters({ fromDate: '2026-04-01' })).toBe(true);
    expect(hasActiveFilters({ toDate: '2026-04-30' })).toBe(true);
  });
});

describe('buildEncounterFilterQuery', () => {
  it('sends nothing when nothing is filtered', () => {
    expect(buildEncounterFilterQuery({})).toBe('');
  });

  it('asks the server for one encounter type', () => {
    expect(buildEncounterFilterQuery({ encounterType: consultationType })).toBe('&encounterType=type-consultation');
  });

  it('covers whole days at both ends of the range, in the server’s own time zone', () => {
    expect(buildEncounterFilterQuery({ fromDate: '2026-04-01', toDate: '2026-04-30' })).toBe(
      '&fromdate=2026-04-01T00:00:00&todate=2026-04-30T23:59:59',
    );
  });
});

describe('matchesEncounterFilters', () => {
  it('keeps everything when nothing is filtered', () => {
    expect(matchesEncounterFilters(consultation, {})).toBe(true);
  });

  it('keeps only the chosen encounter type', () => {
    expect(matchesEncounterFilters(consultation, { encounterType: consultationType })).toBe(true);
    expect(matchesEncounterFilters(consultation, { encounterType: checkinType })).toBe(false);
  });

  it('treats both ends of the date range as inclusive', () => {
    const day = toDateKey(new Date(consultation.encounterDatetime));

    expect(matchesEncounterFilters(consultation, { fromDate: day, toDate: day })).toBe(true);
    expect(matchesEncounterFilters(consultation, { fromDate: '2026-04-01', toDate: '2026-04-30' })).toBe(true);
    expect(matchesEncounterFilters(consultation, { fromDate: '2026-04-19' })).toBe(false);
    expect(matchesEncounterFilters(consultation, { toDate: '2026-04-17' })).toBe(false);
  });

  it('requires every filter to match', () => {
    expect(matchesEncounterFilters(consultation, { encounterType: consultationType, fromDate: '2026-04-19' })).toBe(
      false,
    );
  });

  it('excludes an encounter with no date once a date range is set', () => {
    expect(matchesEncounterFilters({ uuid: 'enc-2' }, { fromDate: '2026-04-01' })).toBe(false);
    expect(matchesEncounterFilters({ uuid: 'enc-2' }, {})).toBe(true);
  });
});

describe('distinctEncounterTypes', () => {
  it('collects each type a patient has once, sorted by name', () => {
    expect(
      distinctEncounterTypes([
        { uuid: 'enc-1', encounterType: consultationType },
        { uuid: 'enc-2', encounterType: checkinType },
        { uuid: 'enc-3', encounterType: { ...consultationType } },
      ]),
    ).toEqual([checkinType, consultationType]);
  });

  it('skips encounters with no type, and copes with none at all', () => {
    expect(distinctEncounterTypes([{ uuid: 'enc-1' }])).toEqual([]);
    expect(distinctEncounterTypes([])).toEqual([]);
  });
});
