import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  type FetchResponse,
  openmrsFetch,
  restBaseUrl,
  useOpenmrsFetchAll,
  useOpenmrsPagination,
} from '@openmrs/esm-framework';
import { type AuditEncounter, type AuditObs, type AuditPatient, type ObsTreeNode, type PagedResponse } from '../types';
import {
  buildEncounterFilterQuery,
  distinctEncounterTypes,
  type EncounterFilters,
  matchesEncounterFilters,
} from './encounter-filters';
import { buildObsTree } from './obs-audit';
import { buildAuditEvents, type ObsByEncounter, summariseByUser } from './patient-activity';

const patientRep =
  'custom:(uuid,display,identifiers:(uuid,identifier,preferred,identifierType:(uuid,display))' +
  ',person:(display,gender,age,birthdate,dead))';

/**
 * `patient` is needed to narrow the free-text search used to list deleted encounters, and
 * `auditInfo` is what the activity view reads to say who created, changed or deleted each one.
 */
const encounterListRep =
  'custom:(uuid,display,encounterDatetime,voided,patient:(uuid),encounterType:(uuid,display)' +
  ',form:(uuid,display),location:(uuid,display)' +
  ',encounterProviders:(uuid,voided,provider:(uuid,display),encounterRole:(uuid,display)),auditInfo)';

const encounterDetailRep =
  'custom:(uuid,display,encounterDatetime,voided,patient:(uuid,display,identifiers:(uuid,identifier,preferred))' +
  ',location:(uuid,display),form:(uuid,display,version),encounterType:(uuid,display)' +
  ',visit:(uuid,display,startDatetime,visitType:(uuid,display))' +
  ',encounterProviders:(uuid,voided,provider:(uuid,display,identifier),encounterRole:(uuid,display)),auditInfo)';

/**
 * `value:ref` keeps coded values down to a `{uuid, display}` reference while leaving numeric, text
 * and datetime values as the scalars they are. `previousVersion` and `auditInfo` are what make the
 * audit trail possible: the former links an obs to the value it replaced, the latter carries the
 * creator, the editor and the voiding user with their timestamps.
 */
const obsRep =
  'custom:(uuid,display,obsDatetime,voided,comment,formFieldPath,value:ref' +
  ',concept:(uuid,display,descriptions:(description,locale)),obsGroup:(uuid)' +
  ',previousVersion:(uuid,display),auditInfo)';

/** A stable identity, so the unfiltered reads do not rebuild their memos on every render. */
const noFilters: EncounterFilters = {};

/** Just enough of an obs to say who touched it and when. */
const activityObsRep = 'custom:(uuid,voided,concept:(uuid,display),previousVersion:(uuid),auditInfo)';

/**
 * The framework's paging hooks default to their own binding of `openmrsFetch`; naming ours keeps
 * every request this module makes going through the one function, which is also what lets tests
 * stand in for it.
 */
const restFetchOptions = { fetcher: openmrsFetch };

/**
 * The page size asked for on bulk reads. Without it the server falls back to
 * `webservices.rest.maxResultsDefault`, which is 50 by default and means more round trips.
 */
const bulkPageSize = 100;
const maxBulkPages = 25;

/**
 * Reads every page of a paginated REST endpoint imperatively.
 *
 * `useOpenmrsFetchAll` covers this wherever the url is known at render time. The activity scan is
 * the exception: it reads the observations of many encounters, and a hook cannot be called once
 * per encounter, so that one loop needs a plain function.
 */
async function fetchAllPages<T>(url: string): Promise<Array<T>> {
  const results: Array<T> = [];
  const separator = url.includes('?') ? '&' : '?';

  for (let page = 0; page < maxBulkPages; page++) {
    const response = await openmrsFetch<PagedResponse<T>>(
      `${url}${separator}startIndex=${page * bulkPageSize}&limit=${bulkPageSize}`,
    );
    const batch = response?.data?.results ?? [];
    results.push(...batch);
    if (batch.length < bulkPageSize) {
      break;
    }
  }

  return results;
}

/** How many encounters' observations to read at once, so a scan does not flood the server. */
const scanConcurrency = 5;

/** Runs `worker` over every item, keeping at most `limit` requests in flight. */
async function mapWithConcurrency<T, R>(items: Array<T>, limit: number, worker: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/** The identifier to show for a patient, and the one to search encounters by. */
export function getPreferredIdentifier(patient: AuditPatient | undefined): string | undefined {
  const identifiers = patient?.identifiers;
  if (!identifiers?.length) {
    return undefined;
  }
  return (identifiers.find((identifier) => identifier.preferred) ?? identifiers[0]).identifier;
}

/**
 * Searches patients by name or identifier, one page at a time. The audit trail starts here
 * because a patient is what an auditor has to hand — a name, or an EMR ID off a paper form.
 */
export function usePatientSearch(query: string, page: number, pageSize: number) {
  const startIndex = (page - 1) * pageSize;
  const url = query
    ? `${restBaseUrl}/patient?q=${encodeURIComponent(query)}&v=${patientRep}` +
      `&startIndex=${startIndex}&limit=${pageSize}&totalCount=true`
    : null;

  const { data, error, isLoading } = useSWR<FetchResponse<PagedResponse<AuditPatient>>>(url, openmrsFetch);

  return {
    patients: data?.data?.results ?? [],
    totalCount: data?.data?.totalCount ?? data?.data?.results?.length ?? 0,
    error,
    isLoading,
  };
}

export function useAuditPatient(patientUuid: string | null) {
  const url = patientUuid ? `${restBaseUrl}/patient/${patientUuid}?v=${patientRep}` : null;
  const { data, error, isLoading } = useSWR<FetchResponse<AuditPatient>>(url, openmrsFetch);

  return { patient: data?.data, error, isLoading };
}

/**
 * The search phrase used to reach a patient's deleted encounters, and the url that reads them.
 * Both `usePatientEncounters` and `usePatientEncounterTypes` need that list, so they build the
 * same url and SWR serves it to whichever of them asks second.
 */
function encounterSearchPhrase(patient: AuditPatient | undefined): string | undefined {
  return getPreferredIdentifier(patient) ?? patient?.person?.display;
}

/**
 * Whether a patient's deleted encounters can be reached at all. The free-text search that finds
 * them needs a phrase to search on, so a patient with neither an identifier nor a name has none.
 */
export function canListDeletedEncounters(patient: AuditPatient | undefined): boolean {
  return Boolean(encounterSearchPhrase(patient));
}

function deletedEncountersUrl(patient: AuditPatient | undefined): string | null {
  const searchPhrase = encounterSearchPhrase(patient);
  return patient && searchPhrase
    ? `${restBaseUrl}/encounter?q=${encodeURIComponent(searchPhrase)}&includeAll=true&v=${encounterListRep}` +
        `&limit=${bulkPageSize}`
    : null;
}

function encountersForPatient(encounters: Array<AuditEncounter> | undefined, patient: AuditPatient | undefined) {
  return (encounters ?? []).filter((encounter) => encounter.patient?.uuid === patient?.uuid);
}

/**
 * Every encounter a patient has, in one go rather than a page at a time — what the encounter type
 * options and the activity view both need. The two paths mirror `usePatientEncounters`: the
 * by-patient search for live encounters, and the free-text search when deleted ones are wanted.
 * Both use `encounterListRep`, so a read made for one caller serves the others from cache.
 */
export function useAllPatientEncounters(
  patient: AuditPatient | undefined,
  includeDeleted: boolean,
  filters: EncounterFilters,
) {
  const scanUrl =
    patient && !includeDeleted
      ? `${restBaseUrl}/encounter?patient=${patient.uuid}&v=${encounterListRep}` +
        `${buildEncounterFilterQuery(filters)}&order=desc&limit=${bulkPageSize}`
      : null;
  // `useOpenmrsFetchAll` takes a null url to mean "do not fetch", though its type does not say so.
  const scanResult = useOpenmrsFetchAll<AuditEncounter>(scanUrl as string, restFetchOptions);
  const bulkResult = useOpenmrsFetchAll<AuditEncounter>(
    (includeDeleted ? deletedEncountersUrl(patient) : null) as string,
    restFetchOptions,
  );

  const encounters = useMemo(() => {
    if (!includeDeleted) {
      return scanResult.data ?? [];
    }
    return encountersForPatient(bulkResult.data, patient)
      .filter((encounter) => matchesEncounterFilters(encounter, filters))
      .sort((a, b) => (b.encounterDatetime ?? '').localeCompare(a.encounterDatetime ?? ''));
  }, [bulkResult.data, filters, includeDeleted, patient, scanResult.data]);

  return {
    encounters,
    error: includeDeleted ? bulkResult.error : scanResult.error,
    isLoading: includeDeleted ? bulkResult.isLoading : scanResult.isLoading,
  };
}

/**
 * The encounter types to offer as filters: the ones this patient's own encounters use, so the
 * dropdown never offers a type that would return nothing. Read unfiltered, so choosing a type
 * does not narrow the choices left.
 */
export function usePatientEncounterTypes(patient: AuditPatient | undefined, includeDeleted: boolean) {
  const { encounters, error, isLoading } = useAllPatientEncounters(patient, includeDeleted, noFilters);
  const encounterTypes = useMemo(() => distinctEncounterTypes(encounters), [encounters]);

  return { encounterTypes, error, isLoading };
}

/**
 * One page of a patient's encounters, optionally narrowed by encounter type and date range, with
 * the page to show and the callback to change it — whichever of the two paths below is in use.
 */
interface PatientEncountersResult {
  encounters: Array<AuditEncounter>;
  totalCount: number;
  currentPage: number;
  goTo(page: number): void;
  error: unknown;
  isLoading: boolean;
  /** True when the patient has no identifier to run the deleted-encounter search with. */
  cannotIncludeDeleted: boolean;
}

/**
 * Lists a patient's encounters, a page at a time.
 *
 * Live encounters are paged by the server: `useOpenmrsPagination` owns the page number and asks
 * for one page at a time, so the size of a patient's record costs nothing to display.
 *
 * Deleted encounters cannot be paged that way. The encounter-by-patient search always excludes
 * voided encounters, so showing them means falling back to the free-text encounter search, which
 * does honour `includeAll` but matches any patient whose name or identifier contains the phrase
 * and takes no filter parameters. Its results therefore have to be read in full, narrowed to the
 * patient in hand, filtered, and paged here — the one case where the whole list is fetched.
 */
export function usePatientEncounters(
  patient: AuditPatient | undefined,
  includeDeleted: boolean,
  filters: EncounterFilters,
  pageSize: number,
): PatientEncountersResult {
  const pagedUrl =
    patient && !includeDeleted
      ? `${restBaseUrl}/encounter?patient=${patient.uuid}&v=${encounterListRep}` +
        `${buildEncounterFilterQuery(filters)}&order=desc`
      : null;
  // `useOpenmrsPagination` appends limit, startIndex and totalCount itself, so the url omits them.
  const pagedResult = useOpenmrsPagination<AuditEncounter>(pagedUrl as string, pageSize, restFetchOptions);

  const bulkResult = useOpenmrsFetchAll<AuditEncounter>(
    (includeDeleted ? deletedEncountersUrl(patient) : null) as string,
    restFetchOptions,
  );
  const [clientPage, setClientPage] = useState(1);

  const deletedEncounters = useMemo(() => {
    if (!includeDeleted) {
      return [];
    }
    return encountersForPatient(bulkResult.data, patient)
      .filter((encounter) => matchesEncounterFilters(encounter, filters))
      .sort((a, b) => (b.encounterDatetime ?? '').localeCompare(a.encounterDatetime ?? ''));
  }, [bulkResult.data, filters, includeDeleted, patient]);

  /**
   * A filter, the deleted toggle or a different patient changes which encounters exist, so the
   * paging starts over. `goTo` refuses a page it considers out of bounds, so it is only called
   * when there is somewhere to go back from.
   */
  useEffect(() => {
    setClientPage(1);
    if (pagedResult.currentPage !== 1) {
      pagedResult.goTo(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, includeDeleted, patient?.uuid]);

  if (includeDeleted) {
    const totalPages = Math.max(1, Math.ceil(deletedEncounters.length / pageSize));
    const currentPage = Math.min(clientPage, totalPages);
    return {
      encounters: deletedEncounters.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      totalCount: deletedEncounters.length,
      currentPage,
      goTo: setClientPage,
      error: bulkResult.error,
      isLoading: bulkResult.isLoading,
      cannotIncludeDeleted: Boolean(patient) && !canListDeletedEncounters(patient),
    };
  }

  return {
    encounters: pagedResult.data ?? [],
    // The hook reports NaN until the first page has been read.
    totalCount: Number.isNaN(pagedResult.totalCount) ? 0 : pagedResult.totalCount,
    currentPage: pagedResult.currentPage,
    goTo: pagedResult.goTo,
    error: pagedResult.error,
    isLoading: pagedResult.isLoading,
    cannotIncludeDeleted: false,
  };
}

/**
 * Loads one encounter together with every obs ever recorded against it — group members and voided
 * obs included, which is what `includeAll` buys — and assembles the audit trail.
 */
export function useEncounterAudit(encounterUuid: string | null): {
  encounter: AuditEncounter | undefined;
  obsTree: Array<ObsTreeNode>;
  error: Error | undefined;
  isLoading: boolean;
} {
  const encounterUrl = encounterUuid ? `${restBaseUrl}/encounter/${encounterUuid}?v=${encounterDetailRep}` : null;
  const encounterResult = useSWR<FetchResponse<AuditEncounter>>(encounterUrl, openmrsFetch);

  const obsUrl = encounterUuid
    ? `${restBaseUrl}/obs?encounter=${encounterUuid}&includeAll=true&v=${obsRep}&limit=${bulkPageSize}`
    : null;
  const obsResult = useOpenmrsFetchAll<AuditObs>(obsUrl as string, restFetchOptions);

  const encounter = encounterResult.data?.data;
  const obsTree = useMemo(() => buildObsTree(obsResult.data ?? [], encounter), [obsResult.data, encounter]);

  return {
    encounter,
    obsTree,
    error: encounterResult.error ?? obsResult.error,
    isLoading: encounterResult.isLoading || obsResult.isLoading,
  };
}

/**
 * Who touched this patient's record: every creation, edit and deletion across their encounters,
 * summarised per user and listed in order.
 *
 * Encounter rows carry their own `auditInfo`, and every matching encounter has already been read,
 * so who created, changed and deleted encounters comes free.
 *
 * Observations do not: each encounter's observations need their own request, because the
 * obs-by-encounter search is the only one that honours `includeAll` and so the only one that can
 * see deleted observations. Every matching encounter is read all the same, so the view is complete
 * — which means a patient with a long record costs one request per encounter, a few at a time.
 * `scanProgress` is reported so the caller can show how far it has got.
 */
export function usePatientActivity(
  patient: AuditPatient | undefined,
  includeDeleted: boolean,
  filters: EncounterFilters,
) {
  const {
    encounters,
    error: encountersError,
    isLoading: isLoadingEncounters,
  } = useAllPatientEncounters(patient, includeDeleted, filters);

  const [encountersRead, setEncountersRead] = useState(0);
  const encounterUuids = useMemo(() => encounters.map((encounter) => encounter.uuid), [encounters]);

  const obsResult = useSWR<ObsByEncounter>(
    encounterUuids.length ? ['audit-activity-obs', encounterUuids] : null,
    async () => {
      setEncountersRead(0);
      let read = 0;
      const perEncounter = await mapWithConcurrency(encounterUuids, scanConcurrency, async (encounterUuid) => {
        const obs = await fetchAllPages<AuditObs>(
          `${restBaseUrl}/obs?encounter=${encounterUuid}&includeAll=true&v=${activityObsRep}`,
        );
        setEncountersRead((read += 1));
        return obs;
      });
      return Object.fromEntries(encounterUuids.map((encounterUuid, index) => [encounterUuid, perEncounter[index]]));
    },
  );

  const events = useMemo(() => buildAuditEvents(encounters, obsResult.data ?? {}), [encounters, obsResult.data]);
  const userActivity = useMemo(() => summariseByUser(events), [events]);

  return {
    events,
    userActivity,
    /** How far the observation reads have got, for a view that has to wait on a long record. */
    scanProgress: { read: encountersRead, total: encounterUuids.length },
    error: encountersError ?? obsResult.error,
    isLoading: isLoadingEncounters || obsResult.isLoading,
  };
}
