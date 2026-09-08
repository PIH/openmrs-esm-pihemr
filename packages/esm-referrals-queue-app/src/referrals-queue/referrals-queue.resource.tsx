import { openmrsFetch, openmrsObservableFetch } from '@openmrs/esm-framework';
import { type Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export function getReferrals({ fromDate, toDate, locale, locationUuid }): Observable<Object[]> {
  return openmrsObservableFetch(
    `/ws/rest/v1/reportingrest/reportdata/cd7dfde7-764a-4da6-81c2-d5887ed1df51?startDate=${fromDate}&endDate=${toDate}&locale=${locale}&location=${locationUuid}`,
  ).pipe(map(({ data }) => data['dataSets'][0]['rows']));
}

const LOCATION_ANCESTOR_REPRESENTATION = 'custom:(uuid,parentLocation:ref)';

/**
 * Walks up the location hierarchy from `startingLocationUuid` (via
 * `parentLocation`), one REST call per level, looking for the nearest
 * location — starting with `startingLocationUuid` itself — whose uuid is a
 * member of `candidateUuids`. Returns `undefined` if the walk reaches the
 * root, hits a cycle, or a request fails. Zero network calls if
 * `startingLocationUuid` is already a member of `candidateUuids`.
 */
export async function findNearestVisitLocationUuid(
  startingLocationUuid: string | undefined,
  candidateUuids: Set<string>,
): Promise<string | undefined> {
  let currentUuid = startingLocationUuid;
  const visited = new Set<string>();

  while (currentUuid) {
    if (candidateUuids.has(currentUuid)) {
      return currentUuid;
    }
    if (visited.has(currentUuid)) {
      return undefined;
    }
    visited.add(currentUuid);

    try {
      const { data } = await openmrsFetch(`/ws/rest/v1/location/${currentUuid}?v=${LOCATION_ANCESTOR_REPRESENTATION}`);
      currentUuid = data?.parentLocation?.uuid;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  return undefined;
}
