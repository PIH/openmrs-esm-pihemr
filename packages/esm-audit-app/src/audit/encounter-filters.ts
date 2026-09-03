import { type AuditEncounter, type OpenmrsResourceRef } from '../types';

/**
 * The filters an auditor can narrow a patient's encounter list by. Dates are held as calendar
 * dates (`YYYY-MM-DD`) rather than instants, because that is what someone picking a date means,
 * and both bounds are inclusive.
 */
export interface EncounterFilters {
  /**
   * The whole reference rather than just the uuid, so that the chosen type stays displayable even
   * if it drops out of the available options — which happens when deleted encounters are hidden
   * again and the type only occurred on those.
   */
  encounterType?: OpenmrsResourceRef;
  fromDate?: string;
  toDate?: string;
}

/**
 * The encounter types a patient actually has, which is what their encounter list is worth
 * filtering by — a dropdown of every type in the system would mostly offer types that return
 * nothing for this patient.
 */
export function distinctEncounterTypes(encounters: Array<AuditEncounter>): Array<OpenmrsResourceRef> {
  const byUuid = new Map<string, OpenmrsResourceRef>();
  for (const encounter of encounters) {
    if (encounter.encounterType?.uuid) {
      byUuid.set(encounter.encounterType.uuid, encounter.encounterType);
    }
  }
  return Array.from(byUuid.values()).sort((a, b) => (a.display ?? '').localeCompare(b.display ?? ''));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The calendar date a `Date` falls on, in the browser's time zone. */
export function toDateKey(date: Date | null | undefined): string | undefined {
  if (!date || Number.isNaN(date.getTime())) {
    return undefined;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight on a calendar date, for handing a stored filter back to the date picker. */
export function fromDateKey(key: string | undefined): Date | null {
  if (!key) {
    return null;
  }
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function hasActiveFilters(filters: EncounterFilters): boolean {
  return Boolean(filters.encounterType || filters.fromDate || filters.toDate);
}

/**
 * The query parameters the encounter-by-patient search understands. The dates are sent without a
 * time zone so the server reads them as its own wall clock — the facility's day, which is what the
 * auditor picking a date means — and `todate` covers the whole of its day, since the API compares
 * it against `encounterDatetime` with `<=`.
 */
export function buildEncounterFilterQuery(filters: EncounterFilters): string {
  let query = '';
  if (filters.encounterType) {
    query += `&encounterType=${filters.encounterType.uuid}`;
  }
  if (filters.fromDate) {
    query += `&fromdate=${filters.fromDate}T00:00:00`;
  }
  if (filters.toDate) {
    query += `&todate=${filters.toDate}T23:59:59`;
  }
  return query;
}

/**
 * The same filters applied on the client, for the free-text search used to list deleted
 * encounters, which the REST API cannot filter server-side.
 */
export function matchesEncounterFilters(encounter: AuditEncounter, filters: EncounterFilters): boolean {
  if (filters.encounterType && encounter.encounterType?.uuid !== filters.encounterType.uuid) {
    return false;
  }

  if (filters.fromDate || filters.toDate) {
    const day = encounter.encounterDatetime ? toDateKey(new Date(encounter.encounterDatetime)) : undefined;
    if (!day) {
      return false;
    }
    if (filters.fromDate && day < filters.fromDate) {
      return false;
    }
    if (filters.toDate && day > filters.toDate) {
      return false;
    }
  }

  return true;
}
