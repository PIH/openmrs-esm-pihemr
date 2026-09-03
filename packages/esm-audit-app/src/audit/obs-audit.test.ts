import { type AuditEncounter, type AuditObs } from '../types';
import {
  buildObsTree,
  flattenObsTree,
  formatObsValue,
  getConceptDescription,
  getObsChangeStatus,
  isVoidedStatus,
} from './obs-audit';

const encounterCreated = '2026-09-01T11:09:00.000+0000';
const laterThanEncounter = '2026-09-02T08:30:00.000+0000';

const encounter: AuditEncounter = {
  uuid: 'enc-1',
  auditInfo: { creator: { uuid: 'user-1', display: 'Cos John' }, dateCreated: encounterCreated },
};

function obs(overrides: Partial<AuditObs> & { uuid: string }): AuditObs {
  return {
    concept: { uuid: `concept-${overrides.uuid}`, display: 'Pulse' },
    auditInfo: { creator: { uuid: 'user-1', display: 'Cos John' }, dateCreated: encounterCreated },
    ...overrides,
  };
}

describe('getObsChangeStatus', () => {
  it('reports an obs created with its encounter as unchanged', () => {
    expect(getObsChangeStatus(obs({ uuid: 'a' }), encounter, new Set())).toBe('unchanged');
  });

  it('reports an obs that replaced an earlier one as edited', () => {
    const edited = obs({ uuid: 'a', previousVersion: { uuid: 'b' }, auditInfo: { dateCreated: laterThanEncounter } });
    expect(getObsChangeStatus(edited, encounter, new Set())).toBe('edited');
  });

  it('reports an obs created after its encounter as added later', () => {
    const added = obs({ uuid: 'a', auditInfo: { dateCreated: laterThanEncounter } });
    expect(getObsChangeStatus(added, encounter, new Set())).toBe('addedAfterEncounter');
  });

  it('reports a voided obs as deleted', () => {
    expect(getObsChangeStatus(obs({ uuid: 'a', voided: true }), encounter, new Set())).toBe('deleted');
  });

  it('reports a voided obs that a later obs replaced as a superseded value', () => {
    expect(getObsChangeStatus(obs({ uuid: 'a', voided: true }), encounter, new Set(['a']))).toBe('supersededValue');
  });

  it('does not guess when either creation date is missing', () => {
    expect(getObsChangeStatus(obs({ uuid: 'a', auditInfo: {} }), encounter, new Set())).toBe('unchanged');
    expect(getObsChangeStatus(obs({ uuid: 'a' }), undefined, new Set())).toBe('unchanged');
  });

  it('knows which statuses mean the obs row is voided', () => {
    expect(isVoidedStatus('deleted')).toBe(true);
    expect(isVoidedStatus('supersededValue')).toBe(true);
    expect(isVoidedStatus('edited')).toBe(false);
  });
});

describe('buildObsTree', () => {
  it('nests obs group members under their group and tags each obs with its status', () => {
    const tree = buildObsTree(
      [
        obs({ uuid: 'member', obsGroup: { uuid: 'group' }, concept: { uuid: 'c-2', display: 'Sign/Symptom name' } }),
        obs({ uuid: 'group', concept: { uuid: 'c-1', display: 'Sign/Symptom construct' } }),
      ],
      encounter,
    );

    expect(tree).toHaveLength(1);
    expect(tree[0].obs.uuid).toBe('group');
    expect(tree[0].depth).toBe(0);
    expect(tree[0].status).toBe('unchanged');
    expect(tree[0].children.map((child) => child.obs.uuid)).toEqual(['member']);
    expect(tree[0].children[0].depth).toBe(1);
  });

  it('keeps an obs whose group is missing from the list at the top level', () => {
    const tree = buildObsTree([obs({ uuid: 'orphan', obsGroup: { uuid: 'not-loaded' } })], encounter);

    expect(tree.map((node) => node.obs.uuid)).toEqual(['orphan']);
  });

  it('puts the versions of one value together, newest first', () => {
    const tree = buildObsTree(
      [
        obs({
          uuid: 'pulse-old',
          value: 67,
          voided: true,
          formFieldPath: 'covid.pulse',
          auditInfo: { dateCreated: encounterCreated },
        }),
        obs({ uuid: 'temperature', value: 38, formFieldPath: 'covid.temperature' }),
        obs({
          uuid: 'pulse-new',
          value: 68,
          previousVersion: { uuid: 'pulse-old' },
          formFieldPath: 'covid.pulse',
          auditInfo: { dateCreated: laterThanEncounter },
        }),
      ],
      encounter,
    );

    expect(tree.map((node) => [node.obs.uuid, node.status])).toEqual([
      ['pulse-new', 'edited'],
      ['pulse-old', 'supersededValue'],
      ['temperature', 'unchanged'],
    ]);
  });
});

describe('flattenObsTree', () => {
  const tree = buildObsTree(
    [
      obs({ uuid: 'group', voided: true, concept: { uuid: 'c-1', display: 'Group' } }),
      obs({ uuid: 'member', voided: true, obsGroup: { uuid: 'group' } }),
      obs({ uuid: 'kept' }),
    ],
    encounter,
  );

  it('returns every obs when deleted obs are shown', () => {
    expect(flattenObsTree(tree, true).map((node) => node.obs.uuid)).toEqual(['group', 'member', 'kept']);
  });

  it('drops deleted obs, and anything nested inside them, when they are hidden', () => {
    expect(flattenObsTree(tree, false).map((node) => node.obs.uuid)).toEqual(['kept']);
  });
});

describe('formatObsValue', () => {
  it('displays coded values by their name and scalar values as they are', () => {
    expect(formatObsValue({ uuid: 'concept-yes', display: 'Yes' })).toBe('Yes');
    expect(formatObsValue(68)).toBe('68');
    expect(formatObsValue('advil 100')).toBe('advil 100');
  });

  it('displays nothing for an obs with no value, such as an obs group', () => {
    expect(formatObsValue(null)).toBe('');
    expect(formatObsValue(undefined)).toBe('');
  });
});

describe('getConceptDescription', () => {
  const described = obs({
    uuid: 'a',
    concept: {
      uuid: 'c-1',
      display: 'Pulse',
      descriptions: [
        { description: 'Battements par minute', locale: 'fr' },
        { description: 'Beats per minute', locale: 'en' },
      ],
    },
  });

  it('prefers the description matching the given locale', () => {
    expect(getConceptDescription(described, 'en_GB')).toBe('Beats per minute');
    expect(getConceptDescription(described, 'fr')).toBe('Battements par minute');
  });

  it('falls back to the first description when nothing matches', () => {
    expect(getConceptDescription(described, 'es')).toBe('Battements par minute');
    expect(getConceptDescription(obs({ uuid: 'a' }), 'en')).toBeUndefined();
  });
});
