import { type AuditEncounter, type AuditObs, type ObsChangeStatus, type ObsTreeNode, type ObsValue } from '../types';

/** Statuses that mean the obs row is voided in the database. */
const voidedStatuses: Array<ObsChangeStatus> = ['deleted', 'supersededValue'];

export function isVoidedStatus(status: ObsChangeStatus): boolean {
  return voidedStatuses.includes(status);
}

function toTime(date: string | undefined): number | null {
  if (!date) {
    return null;
  }
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Works out how an obs came to look the way it does. This reproduces what the legacy
 * `admin/encounters/encounter.form` page showed, using the data the REST API exposes:
 *
 * - an obs that points at a `previousVersion` replaced an earlier obs, so its value was edited;
 * - an obs created later than its encounter was added after the encounter was first saved.
 *   OpenMRS stamps the same `dateCreated` on an encounter and on every obs saved with it, so an
 *   obs whose `dateCreated` differs from the encounter's was saved in a later transaction;
 * - a voided obs was deleted, unless a surviving obs points back at it as its `previousVersion`,
 *   in which case it is the value that was edited away.
 *
 * @param obs the obs to classify
 * @param encounter the encounter the obs belongs to, for its creation date
 * @param supersededUuids uuids that some other obs in the encounter names as its `previousVersion`
 */
export function getObsChangeStatus(
  obs: AuditObs,
  encounter: AuditEncounter | undefined,
  supersededUuids: Set<string>,
): ObsChangeStatus {
  if (obs.voided) {
    return supersededUuids.has(obs.uuid) ? 'supersededValue' : 'deleted';
  }

  if (obs.previousVersion) {
    return 'edited';
  }

  const obsCreated = toTime(obs.auditInfo?.dateCreated);
  const encounterCreated = toTime(encounter?.auditInfo?.dateCreated);
  if (obsCreated !== null && encounterCreated !== null && obsCreated !== encounterCreated) {
    return 'addedAfterEncounter';
  }

  return 'unchanged';
}

/**
 * Sorts obs so that every version of a value sits together, newest first. Obs recorded through a
 * form share a `formFieldPath`, which also approximates the order of the fields on that form; obs
 * recorded some other way fall back to the concept name.
 */
function compareObs(a: AuditObs, b: AuditObs): number {
  const groupA = a.formFieldPath ?? a.concept?.display ?? '';
  const groupB = b.formFieldPath ?? b.concept?.display ?? '';
  if (groupA !== groupB) {
    return groupA.localeCompare(groupB);
  }

  const createdA = toTime(a.auditInfo?.dateCreated) ?? 0;
  const createdB = toTime(b.auditInfo?.dateCreated) ?? 0;
  if (createdA !== createdB) {
    return createdB - createdA;
  }

  return a.uuid.localeCompare(b.uuid);
}

/**
 * Turns the flat list of obs the REST API returns for an encounter — which includes obs group
 * members and voided obs — into the group hierarchy, tagging each obs with its change status.
 *
 * An obs whose group is not in the list (which the API should not return, but which would
 * otherwise silently drop the obs) is treated as a root so that it stays visible.
 */
export function buildObsTree(obsList: Array<AuditObs>, encounter?: AuditEncounter): Array<ObsTreeNode> {
  const supersededUuids = new Set(
    obsList.map((obs) => obs.previousVersion?.uuid).filter((uuid): uuid is string => Boolean(uuid)),
  );

  const nodes = new Map<string, ObsTreeNode>(
    obsList.map((obs) => [
      obs.uuid,
      { obs, status: getObsChangeStatus(obs, encounter, supersededUuids), depth: 0, children: [] },
    ]),
  );

  const roots: Array<ObsTreeNode> = [];
  for (const node of nodes.values()) {
    const parent = node.obs.obsGroup?.uuid ? nodes.get(node.obs.obsGroup.uuid) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortAndSetDepth = (siblings: Array<ObsTreeNode>, depth: number) => {
    siblings.sort((a, b) => compareObs(a.obs, b.obs));
    for (const sibling of siblings) {
      sibling.depth = depth;
      sortAndSetDepth(sibling.children, depth + 1);
    }
  };
  sortAndSetDepth(roots, 0);

  return roots;
}

/**
 * Flattens the obs tree into the rows to render, dropping voided obs (along with anything nested
 * inside them) unless deleted obs are being shown.
 */
export function flattenObsTree(nodes: Array<ObsTreeNode>, showDeleted: boolean): Array<ObsTreeNode> {
  return nodes.flatMap((node) => {
    if (!showDeleted && isVoidedStatus(node.status)) {
      return [];
    }
    return [node, ...flattenObsTree(node.children, showDeleted)];
  });
}

/**
 * Renders an obs value for display. Coded obs (and the drug and location values OpenMRS stores
 * alongside them) arrive as references rather than as scalars.
 */
export function formatObsValue(value: ObsValue | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return value.display ?? '';
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  return String(value);
}

/** Picks the concept description matching the given locale, falling back to whatever is there. */
export function getConceptDescription(obs: AuditObs, locale: string | undefined): string | undefined {
  const descriptions = obs.concept?.descriptions;
  if (!descriptions?.length) {
    return undefined;
  }
  const language = locale?.split(/[-_]/)[0];
  const match = descriptions.find((description) => description.locale?.split(/[-_]/)[0] === language);
  return (match ?? descriptions[0]).description;
}
