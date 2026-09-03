import { type AuditEncounter, type AuditObs } from '../types';
import { buildAuditEvents, eventUserUuid, summariseByUser, unknownUserUuid } from './patient-activity';

const clerk = { uuid: 'user-clerk', display: 'Cos John' };
const nurse = { uuid: 'user-nurse', display: 'Louidor Jean paul' };

const encounterCreated = '2026-09-01T11:09:00.000+0000';
const dayAfter = '2026-09-02T08:30:00.000+0000';

const encounter: AuditEncounter = {
  uuid: 'enc-1',
  encounterDatetime: encounterCreated,
  encounterType: { uuid: 'type-1', display: 'COVID-19 Admission' },
  auditInfo: { creator: clerk, dateCreated: encounterCreated },
};

function obs(overrides: Partial<AuditObs> & { uuid: string }): AuditObs {
  return {
    concept: { uuid: 'concept-pulse', display: 'Pulse' },
    auditInfo: { creator: clerk, dateCreated: encounterCreated },
    ...overrides,
  };
}

describe('buildAuditEvents', () => {
  it('records who created an encounter', () => {
    expect(buildAuditEvents([encounter], {})).toEqual([
      expect.objectContaining({ action: 'encounterCreated', user: clerk, timestamp: encounterCreated }),
    ]);
  });

  it('records an encounter that was changed and one that was deleted', () => {
    const changed: AuditEncounter = {
      ...encounter,
      voided: true,
      auditInfo: {
        creator: clerk,
        dateCreated: encounterCreated,
        changedBy: nurse,
        dateChanged: dayAfter,
        voidedBy: nurse,
        dateVoided: dayAfter,
      },
    };

    expect(buildAuditEvents([changed], {}).map((auditEvent) => auditEvent.action)).toEqual([
      'encounterChanged',
      'encounterDeleted',
      'encounterCreated',
    ]);
  });

  it('counts an edit once, as an edit, rather than as a deletion and a recording', () => {
    const events = buildAuditEvents([encounter], {
      'enc-1': [
        obs({
          uuid: 'obs-new',
          previousVersion: { uuid: 'obs-old' },
          auditInfo: { creator: nurse, dateCreated: dayAfter },
        }),
        obs({
          uuid: 'obs-old',
          voided: true,
          auditInfo: { creator: clerk, dateCreated: encounterCreated, voidedBy: nurse, dateVoided: dayAfter },
        }),
      ],
    });

    expect(events.map((auditEvent) => [auditEvent.action, auditEvent.user?.uuid])).toEqual([
      ['obsEdited', 'user-nurse'],
      ['encounterCreated', 'user-clerk'],
      ['obsRecorded', 'user-clerk'],
    ]);
  });

  it('records an outright deletion alongside the original recording', () => {
    const events = buildAuditEvents([encounter], {
      'enc-1': [
        obs({
          uuid: 'obs-gone',
          voided: true,
          auditInfo: { creator: clerk, dateCreated: encounterCreated, voidedBy: nurse, dateVoided: dayAfter },
        }),
      ],
    });

    expect(events.map((auditEvent) => [auditEvent.action, auditEvent.user?.uuid])).toEqual([
      ['obsDeleted', 'user-nurse'],
      ['encounterCreated', 'user-clerk'],
      ['obsRecorded', 'user-clerk'],
    ]);
    expect(events[0].concept).toBe('Pulse');
  });

  it('leaves out events the api gave no timestamp for', () => {
    expect(buildAuditEvents([{ uuid: 'enc-2' }], {})).toEqual([]);
  });

  it('puts the most recent event first', () => {
    const events = buildAuditEvents([encounter], {
      'enc-1': [obs({ uuid: 'obs-later', auditInfo: { creator: nurse, dateCreated: dayAfter } })],
    });

    expect(events[0].timestamp).toBe(dayAfter);
  });
});

describe('eventUserUuid', () => {
  it('keys an event by its user, or by the unknown user when the api named none', () => {
    const [withUser] = buildAuditEvents([encounter], {});
    const [withoutUser] = buildAuditEvents([{ uuid: 'enc-2', auditInfo: { dateCreated: dayAfter } }], {});

    expect(eventUserUuid(withUser)).toBe(clerk.uuid);
    expect(eventUserUuid(withoutUser)).toBe(unknownUserUuid);
  });
});

describe('summariseByUser', () => {
  const events = buildAuditEvents([encounter], {
    'enc-1': [
      obs({ uuid: 'obs-1' }),
      obs({ uuid: 'obs-2' }),
      obs({
        uuid: 'obs-new',
        previousVersion: { uuid: 'obs-2' },
        auditInfo: { creator: nurse, dateCreated: dayAfter },
      }),
    ],
  });

  it('counts what each user did, busiest first', () => {
    const summary = summariseByUser(events);

    expect(summary.map((activity) => activity.userDisplay)).toEqual(['Cos John', 'Louidor Jean paul']);
    expect(summary[0].counts).toMatchObject({ encounterCreated: 1, obsRecorded: 2, obsEdited: 0 });
    expect(summary[0].totalEvents).toBe(3);
    expect(summary[1].counts).toMatchObject({ obsEdited: 1 });
  });

  it('brackets each user’s activity with when they first and last touched the record', () => {
    const summary = summariseByUser(events);

    expect(summary[0].firstActivity).toBe(encounterCreated);
    expect(summary[0].lastActivity).toBe(encounterCreated);
    expect(summary[1].firstActivity).toBe(dayAfter);
  });

  it('gathers events with no named user rather than dropping them', () => {
    const summary = summariseByUser(buildAuditEvents([{ uuid: 'enc-3', auditInfo: { dateCreated: dayAfter } }], {}));

    expect(summary).toHaveLength(1);
    expect(summary[0].userUuid).toBe(unknownUserUuid);
    expect(summary[0].userDisplay).toBe('');
  });
});
