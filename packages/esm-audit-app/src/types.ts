/**
 * Types for the encounter audit trail. These mirror the shapes returned by the
 * OpenMRS REST API for the custom representations requested in
 * `audit/audit.resource.ts` — keep the two in sync.
 */

/** The `{uuid, display}` shape the REST API uses for a reference to another resource. */
export interface OpenmrsResourceRef {
  uuid: string;
  display?: string;
}

/**
 * The REST API's `auditInfo` property. `changedBy`/`dateChanged` are only set once a
 * row has been edited in place, and the `voided*` fields are only present on voided rows.
 */
export interface AuditInfo {
  creator?: OpenmrsResourceRef;
  dateCreated?: string;
  changedBy?: OpenmrsResourceRef;
  dateChanged?: string;
  voidedBy?: OpenmrsResourceRef;
  dateVoided?: string;
  voidReason?: string;
}

export interface PagedResponse<T> {
  results: Array<T>;
  links?: Array<{ rel: 'prev' | 'next'; uri: string }>;
  totalCount?: number;
}

export interface PatientIdentifier {
  identifier: string;
  preferred?: boolean;
  identifierType?: OpenmrsResourceRef;
}

export interface AuditPatient {
  uuid: string;
  display: string;
  identifiers?: Array<PatientIdentifier>;
  person?: {
    display?: string;
    gender?: string;
    age?: number;
    birthdate?: string;
    dead?: boolean;
  };
}

export interface EncounterProvider {
  uuid: string;
  voided?: boolean;
  provider?: OpenmrsResourceRef & { identifier?: string };
  encounterRole?: OpenmrsResourceRef;
}

export interface AuditEncounter {
  uuid: string;
  display?: string;
  encounterDatetime?: string;
  voided?: boolean;
  patient?: AuditPatient;
  location?: OpenmrsResourceRef;
  form?: OpenmrsResourceRef & { version?: string };
  encounterType?: OpenmrsResourceRef;
  visit?: OpenmrsResourceRef & { startDatetime?: string; visitType?: OpenmrsResourceRef };
  encounterProviders?: Array<EncounterProvider>;
  auditInfo?: AuditInfo;
}

export interface ConceptDescription {
  description?: string;
  locale?: string;
}

/**
 * An obs value is a plain string or number for free-text, numeric and datetime obs, and a
 * reference for coded obs (and for the drug/location values OpenMRS stores as coded-ish obs).
 */
export type ObsValue = string | number | boolean | OpenmrsResourceRef | null;

export interface AuditObs {
  uuid: string;
  display?: string;
  obsDatetime?: string;
  voided?: boolean;
  value?: ObsValue;
  comment?: string;
  formFieldPath?: string;
  concept?: OpenmrsResourceRef & { descriptions?: Array<ConceptDescription> };
  /** Set when this obs is a member of an obs group. */
  obsGroup?: OpenmrsResourceRef;
  /** Set when this obs replaced an earlier one, i.e. when the value was edited. */
  previousVersion?: OpenmrsResourceRef;
  auditInfo?: AuditInfo;
}

/**
 * How an obs came to look the way it does, relative to the encounter it belongs to. Derived
 * rather than stored — see `getObsChangeStatus`.
 */
export type ObsChangeStatus =
  /** Entered when the encounter was first created and never touched since. */
  | 'unchanged'
  /** Replaces an earlier obs: someone changed the value after the fact. */
  | 'edited'
  /** Added to the encounter after the encounter itself was created. */
  | 'addedAfterEncounter'
  /** Voided outright — the value was removed from the encounter. */
  | 'deleted'
  /** Voided because a newer obs replaced it, so it holds a value that used to be current. */
  | 'supersededValue';

/** An obs plus the group nesting and change status the audit table renders. */
export interface ObsTreeNode {
  obs: AuditObs;
  status: ObsChangeStatus;
  depth: number;
  children: Array<ObsTreeNode>;
}
