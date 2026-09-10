import { type AuditObs } from '../types';
import {
  canDiscoverMore,
  countUserObs,
  discoverEncounters,
  emptyStream,
  filterByEncounterType,
  type ObsStream,
  streamToExtend,
} from './user-encounters';

const consultation = { uuid: 'enc-1', encounterType: { uuid: 'type-1', display: 'Oncology Consultation' } };
const checkin = { uuid: 'enc-2', encounterType: { uuid: 'type-2', display: 'Inscription' } };
const vitals = { uuid: 'enc-3', encounterType: { uuid: 'type-3', display: 'Vitals' } };

/** A day in September 2026, as the REST API would report it. */
function day(dayOfMonth: number): string {
  return `2026-09-${String(dayOfMonth).padStart(2, '0')}T08:00:00.000+0000`;
}

function created(uuid: string, encounter: unknown, when: string): AuditObs {
  return { uuid, encounter: encounter as AuditObs['encounter'], auditInfo: { dateCreated: when } };
}

function voided(uuid: string, encounter: unknown, when: string): AuditObs {
  return { uuid, encounter: encounter as AuditObs['encounter'], auditInfo: { dateVoided: when } };
}

function stream(obs: Array<AuditObs>, exhausted = true): ObsStream {
  return { obs, exhausted };
}

/** A search that returned nothing and has nothing more to give. */
const exhaustedStream: ObsStream = { obs: [], exhausted: true };

describe('discoverEncounters', () => {
  it('collapses the observations of one encounter into a single row', () => {
    const activity = discoverEncounters(
      stream([created('obs-1', consultation, day(1)), created('obs-2', consultation, day(2))]),
      exhaustedStream,
    );

    expect(activity).toHaveLength(1);
    expect(activity[0].encounter.uuid).toBe('enc-1');
  });

  it('takes the most recent change as an encounter’s last activity', () => {
    const activity = discoverEncounters(
      stream([created('obs-1', consultation, day(1))]),
      stream([voided('obs-2', consultation, day(7))]),
    );

    expect(activity[0].lastActivity).toBe(day(7));
  });

  it('merges the two searches into one order, most recently changed first', () => {
    const activity = discoverEncounters(
      stream([created('obs-1', vitals, day(6)), created('obs-2', consultation, day(2))]),
      stream([voided('obs-3', checkin, day(4))]),
    );

    expect(activity.map((entry) => entry.encounter.uuid)).toEqual(['enc-3', 'enc-2', 'enc-1']);
  });

  it('leaves out observations that belong to no encounter, having no trail to open', () => {
    expect(discoverEncounters(stream([created('obs-1', undefined, day(1))]), exhaustedStream)).toEqual([]);
  });

  /**
   * The point of reading lazily: a partly-read stream must not offer an encounter whose place a row
   * further down could still take, or the first page would reshuffle as the second was read.
   */
  it('withholds encounters that an unread row could still outrank', () => {
    const partial = stream([created('obs-1', consultation, day(9)), created('obs-2', checkin, day(5))], false);

    const activity = discoverEncounters(partial, exhaustedStream);

    // enc-2 sits at the boundary, so only enc-1 is certainly placed
    expect(activity.map((entry) => entry.encounter.uuid)).toEqual(['enc-1']);
  });

  it('offers everything once both searches are exhausted', () => {
    const activity = discoverEncounters(
      stream([created('obs-1', consultation, day(9)), created('obs-2', checkin, day(5))]),
      exhaustedStream,
    );

    expect(activity.map((entry) => entry.encounter.uuid)).toEqual(['enc-1', 'enc-2']);
  });

  it('trusts nothing while a search has not been read at all', () => {
    const activity = discoverEncounters(stream([created('obs-1', consultation, day(9))]), emptyStream);

    // the voided search is unread rather than exhausted, so its first row could outrank enc-1
    expect(activity).toEqual([]);
  });

  it('trusts only as far as the search that has been read least far', () => {
    const activity = discoverEncounters(
      stream([created('obs-1', consultation, day(9))], false),
      stream([voided('obs-2', checkin, day(3))], false),
    );

    // the created search is read only to day 9, so nothing at or below that is certain yet
    expect(activity).toEqual([]);
  });
});

describe('streamToExtend', () => {
  it('reads from whichever search is holding the boundary up', () => {
    // read only as far as day 9, so this one is holding the boundary up
    const createdBehind = stream([created('obs-1', consultation, day(9))], false);
    const voidedAhead = stream([voided('obs-2', checkin, day(3))], false);
    expect(streamToExtend(createdBehind, voidedAhead)).toBe('created');

    // and the other way round
    const createdAhead = stream([created('obs-3', checkin, day(3))], false);
    const voidedBehind = stream([voided('obs-4', consultation, day(9))], false);
    expect(streamToExtend(createdAhead, voidedBehind)).toBe('voided');
  });

  it('reads from the other one when a search is exhausted', () => {
    expect(streamToExtend(stream([], true), stream([], false))).toBe('voided');
    expect(streamToExtend(stream([], false), stream([], true))).toBe('created');
  });

  it('has nothing left to read once both are exhausted', () => {
    expect(streamToExtend(stream([], true), stream([], true))).toBeNull();
    expect(canDiscoverMore(stream([], true), stream([], true))).toBe(false);
    expect(canDiscoverMore(stream([], true), stream([], false))).toBe(true);
  });
});

describe('countUserObs', () => {
  const user = 'user-1';
  const other = 'user-2';
  const obs = (creator: string, voidedBy?: string): AuditObs => ({
    uuid: `obs-${Math.random()}`,
    auditInfo: {
      creator: { uuid: creator },
      ...(voidedBy ? { voidedBy: { uuid: voidedBy } } : {}),
    },
  });

  it('counts what the user recorded and what they deleted', () => {
    expect(countUserObs([obs(user), obs(user), obs(other, user)], user)).toEqual({ obsCreated: 2, obsVoided: 1 });
  });

  it('counts an observation the user both recorded and deleted in each column', () => {
    expect(countUserObs([obs(user, user)], user)).toEqual({ obsCreated: 1, obsVoided: 1 });
  });

  it('ignores what other users did to the same encounter', () => {
    expect(countUserObs([obs(other), obs(other, other)], user)).toEqual({ obsCreated: 0, obsVoided: 0 });
  });
});

describe('filterByEncounterType', () => {
  const activity = [
    { encounter: consultation, lastActivity: day(9) },
    { encounter: checkin, lastActivity: day(5) },
    { encounter: { uuid: 'enc-4' }, lastActivity: day(4) },
  ];

  it('keeps everything when no type is chosen', () => {
    expect(filterByEncounterType(activity, undefined)).toBe(activity);
  });

  it('keeps only encounters of the chosen type', () => {
    expect(filterByEncounterType(activity, 'type-1').map((entry) => entry.encounter.uuid)).toEqual(['enc-1']);
  });

  it('leaves out an encounter whose type the api did not report', () => {
    expect(filterByEncounterType(activity, 'type-3')).toEqual([]);
  });
});
