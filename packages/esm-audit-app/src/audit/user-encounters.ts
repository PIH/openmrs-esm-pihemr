import { type AuditEncounter, type AuditObs } from '../types';

/** Which audit action a stream of observations was searched by. */
export type AuditAction = 'created' | 'voided';

/** What has been read of one of the two audit searches so far. */
export interface ObsStream {
  /** Rows read so far, in the order the endpoint returned them: audit date descending. */
  obs: Array<AuditObs>;
  /** True once a short page came back, meaning there is nothing further to read. */
  exhausted: boolean;
}

export const emptyStream: ObsStream = { obs: [], exhausted: false };

/** What one user did to the observations of one encounter. */
export interface UserEncounterActivity {
  encounter: AuditEncounter;
  /** The most recent action, which is what the list is ordered by. */
  lastActivity: string;
  /** How many of the encounter's observations the user recorded, once counted exactly. */
  obsCreated?: number;
  /** How many of the encounter's observations the user deleted, once counted exactly. */
  obsVoided?: number;
}

/** When the audit action behind an observation happened, in the stream it came from. */
export function actionTime(obs: AuditObs, action: AuditAction): string {
  return (action === 'created' ? obs.auditInfo?.dateCreated : obs.auditInfo?.dateVoided) ?? '';
}

/**
 * Sorts after any ISO date, standing for a stream whose position is not yet known at all: one that
 * has been read no further than its start and still has rows to come. Such a stream constrains
 * everything, since its very first unread row could outrank anything already discovered.
 */
const unreadWatermark = '\uffff';

/**
 * How far down a stream has been read, as the audit date of its last row.
 *
 * `null` means the stream constrains nothing, because it is exhausted. That is deliberately
 * different from a stream that has simply not been read yet, which constrains everything — a
 * distinction worth keeping, since conflating the two would let the list trust an order that a
 * search nobody has run could still overturn.
 */
function watermark(stream: ObsStream, action: AuditAction): string | null {
  if (stream.exhausted) {
    return null;
  }
  if (stream.obs.length === 0) {
    return unreadWatermark;
  }
  return actionTime(stream.obs[stream.obs.length - 1], action) || unreadWatermark;
}

/** How far the merged order can be trusted, or null when both streams are exhausted. */
function discoveryBoundary(created: ObsStream, voided: ObsStream): string | null {
  const marks = [watermark(created, 'created'), watermark(voided, 'voided')].filter(
    (mark): mark is string => mark !== null,
  );
  return marks.length === 0 ? null : marks.sort().pop();
}

/**
 * The stream to read from next, being whichever is holding the discovery boundary up. Reading the
 * other one cannot reveal an encounter that belongs higher in the list.
 */
export function streamToExtend(created: ObsStream, voided: ObsStream): AuditAction | null {
  if (created.exhausted && voided.exhausted) {
    return null;
  }
  if (created.exhausted) {
    return 'voided';
  }
  if (voided.exhausted) {
    return 'created';
  }
  return (watermark(created, 'created') ?? '') >= (watermark(voided, 'voided') ?? '') ? 'created' : 'voided';
}

/**
 * The encounters discoverable from what has been read, most recently changed first.
 *
 * Both searches return observations by audit date descending, so the first time an encounter
 * appears in the merged stream is its most recent change — which means encounters come out of the
 * merge already in the order the list wants them, without having to read to the end of either
 * search.
 *
 * What has *not* been read still constrains the answer. An observation not yet read can only be
 * older than the last row read from its stream, so any encounter first seen later than both
 * streams' positions is certain to be correctly placed; one at or below that boundary might still
 * be overtaken by a row further down. Only the certain ones are returned, so a page never reorders
 * itself as more is read.
 */
export function discoverEncounters(created: ObsStream, voided: ObsStream): Array<UserEncounterActivity> {
  const boundary = discoveryBoundary(created, voided);

  const firstSeen = new Map<string, UserEncounterActivity>();
  const consider = (stream: ObsStream, action: AuditAction) => {
    for (const obs of stream.obs) {
      const encounter = obs.encounter as AuditEncounter | undefined;
      // An observation can exist outside an encounter, and there is no encounter audit trail to
      // show for one, so it cannot appear in a list of encounters.
      if (!encounter?.uuid) {
        continue;
      }
      const when = actionTime(obs, action);
      const existing = firstSeen.get(encounter.uuid);
      if (!existing) {
        firstSeen.set(encounter.uuid, { encounter, lastActivity: when });
      } else if (when > existing.lastActivity) {
        existing.lastActivity = when;
      }
    }
  };
  consider(created, 'created');
  consider(voided, 'voided');

  return Array.from(firstSeen.values())
    .filter((activity) => boundary === null || activity.lastActivity > boundary)
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity) || a.encounter.uuid.localeCompare(b.encounter.uuid));
}

/**
 * Narrows discovered encounters to one encounter type.
 *
 * The audit endpoint takes no encounter type parameter, so this is applied after the merge rather
 * than by the server. That means a rare type may need much of the trail read before a page's worth
 * of it is found, which is why the scan reports when it stopped early.
 */
export function filterByEncounterType(
  activity: Array<UserEncounterActivity>,
  encounterTypeUuid: string | undefined,
): Array<UserEncounterActivity> {
  if (!encounterTypeUuid) {
    return activity;
  }
  return activity.filter((entry) => entry.encounter.encounterType?.uuid === encounterTypeUuid);
}

/** Whether reading further could reveal more encounters. */
export function canDiscoverMore(created: ObsStream, voided: ObsStream): boolean {
  return !created.exhausted || !voided.exhausted;
}

/**
 * How many of an encounter's observations the given user recorded and deleted.
 *
 * The audit search cannot be narrowed to one encounter, so the counts come from reading the
 * encounter's own observations and attributing them — which is exact, and only done for the rows
 * actually on screen.
 */
export function countUserObs(obsList: Array<AuditObs>, userUuid: string): { obsCreated: number; obsVoided: number } {
  let obsCreated = 0;
  let obsVoided = 0;
  for (const obs of obsList) {
    if (obs.auditInfo?.creator?.uuid === userUuid) {
      obsCreated += 1;
    }
    if (obs.auditInfo?.voidedBy?.uuid === userUuid) {
      obsVoided += 1;
    }
  }
  return { obsCreated, obsVoided };
}
