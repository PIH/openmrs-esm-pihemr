import { type AuditEncounter, type AuditObs, type OpenmrsResourceRef } from '../types';

/** What someone did to a patient's record. */
export type AuditAction =
  | 'encounterCreated'
  | 'encounterChanged'
  | 'encounterDeleted'
  | 'obsRecorded'
  | 'obsEdited'
  | 'obsDeleted';

export interface AuditEvent {
  /** Stable across renders: the row it came from plus what happened to it. */
  key: string;
  action: AuditAction;
  /** When it happened, as the REST API reported it. */
  timestamp: string;
  user: OpenmrsResourceRef | undefined;
  encounter: AuditEncounter;
  /** The concept whose value was touched, for the observation actions. */
  concept?: string;
}

/** One user's footprint on the part of the record that was read. */
export interface UserActivity {
  userUuid: string;
  userDisplay: string;
  counts: Record<AuditAction, number>;
  firstActivity: string;
  lastActivity: string;
  totalEvents: number;
}

/** The obs of one encounter, keyed by the encounter's uuid. */
export type ObsByEncounter = Record<string, Array<AuditObs>>;

/** Stands in for the user on events whose actor the API did not report. */
export const unknownUserUuid = 'unknown';

/**
 * The key an event is grouped and filtered by. `summariseByUser` and the activity log both use it,
 * so a row's counts and the events behind it can never disagree about who did what.
 */
export function eventUserUuid(auditEvent: AuditEvent): string {
  return auditEvent.user?.uuid ?? unknownUserUuid;
}

function event(
  action: AuditAction,
  timestamp: string | undefined,
  user: OpenmrsResourceRef | undefined,
  encounter: AuditEncounter,
  keySuffix: string,
  concept?: string,
): AuditEvent | null {
  return timestamp ? { key: `${keySuffix}:${action}`, action, timestamp, user, encounter, concept } : null;
}

/**
 * Turns encounters and their observations into the list of things people did to the record.
 *
 * Every obs row was created by someone at some point, so each yields one creation event — an edit
 * if it replaced an earlier obs, a plain recording otherwise. A voided obs yields a deletion event
 * too, unless a later obs replaced it: that voiding is the other half of the successor's edit, and
 * counting it again would make one correction look like two acts.
 */
export function buildAuditEvents(encounters: Array<AuditEncounter>, obsByEncounter: ObsByEncounter): Array<AuditEvent> {
  const events: Array<AuditEvent> = [];

  for (const encounter of encounters) {
    const audit = encounter.auditInfo;
    events.push(
      event('encounterCreated', audit?.dateCreated, audit?.creator, encounter, encounter.uuid),
      event('encounterChanged', audit?.dateChanged, audit?.changedBy, encounter, encounter.uuid),
      encounter.voided
        ? event('encounterDeleted', audit?.dateVoided, audit?.voidedBy, encounter, encounter.uuid)
        : null,
    );

    const obsList = obsByEncounter[encounter.uuid] ?? [];
    const supersededUuids = new Set(
      obsList.map((obs) => obs.previousVersion?.uuid).filter((uuid): uuid is string => Boolean(uuid)),
    );

    for (const obs of obsList) {
      const obsAudit = obs.auditInfo;
      const concept = obs.concept?.display;
      events.push(
        event(
          obs.previousVersion ? 'obsEdited' : 'obsRecorded',
          obsAudit?.dateCreated,
          obsAudit?.creator,
          encounter,
          obs.uuid,
          concept,
        ),
        obs.voided && !supersededUuids.has(obs.uuid)
          ? event('obsDeleted', obsAudit?.dateVoided, obsAudit?.voidedBy, encounter, obs.uuid, concept)
          : null,
      );
    }
  }

  return events
    .filter((auditEvent): auditEvent is AuditEvent => auditEvent !== null)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function emptyCounts(): Record<AuditAction, number> {
  return {
    encounterCreated: 0,
    encounterChanged: 0,
    encounterDeleted: 0,
    obsRecorded: 0,
    obsEdited: 0,
    obsDeleted: 0,
  };
}

/**
 * Who touched the record, and how much: one row per user, busiest first. Events whose user the
 * API did not report are gathered under a single unknown user rather than dropped, so the counts
 * still add up to what was read.
 */
export function summariseByUser(events: Array<AuditEvent>): Array<UserActivity> {
  const byUser = new Map<string, UserActivity>();

  for (const auditEvent of events) {
    const userUuid = eventUserUuid(auditEvent);
    let activity = byUser.get(userUuid);
    if (!activity) {
      activity = {
        userUuid,
        userDisplay: auditEvent.user?.display ?? '',
        counts: emptyCounts(),
        firstActivity: auditEvent.timestamp,
        lastActivity: auditEvent.timestamp,
        totalEvents: 0,
      };
      byUser.set(userUuid, activity);
    }

    activity.counts[auditEvent.action] += 1;
    activity.totalEvents += 1;
    if (auditEvent.timestamp < activity.firstActivity) {
      activity.firstActivity = auditEvent.timestamp;
    }
    if (auditEvent.timestamp > activity.lastActivity) {
      activity.lastActivity = auditEvent.timestamp;
    }
  }

  return Array.from(byUser.values()).sort(
    (a, b) => b.totalEvents - a.totalEvents || a.userDisplay.localeCompare(b.userDisplay),
  );
}
