import useSWRImmutable from 'swr/immutable';
import { restBaseUrl, openmrsFetch } from '@openmrs/esm-framework';

export type ObservationInterpretation =
  | 'normal'
  | 'high'
  | 'critically_high'
  | 'off_scale_high'
  | 'low'
  | 'critically_low'
  | 'off_scale_low';

export type ReferenceRangeValue = number | null | undefined;

export interface ObsReferenceRanges {
  hiAbsolute: ReferenceRangeValue;
  hiCritical: ReferenceRangeValue;
  hiNormal: ReferenceRangeValue;
  lowNormal: ReferenceRangeValue;
  lowCritical: ReferenceRangeValue;
  lowAbsolute: ReferenceRangeValue;
}

interface ConceptReferenceRangeResponse {
  results: Array<{
    concept: string;
    display: string;
    hiNormal?: number | null;
    hiAbsolute?: number | null;
    hiCritical?: number | null;
    lowNormal?: number | null;
    lowAbsolute?: number | null;
    lowCritical?: number | null;
    units?: string | null;
  }>;
}

async function fetchReferenceRange(
  conceptUuid: string,
  patientUuid: string | undefined,
): Promise<ObsReferenceRanges | undefined> {
  const url = `${restBaseUrl}/conceptreferencerange/?concept=${conceptUuid}&v=full${
    patientUuid ? `&patient=${patientUuid}` : ''
  }`;
  const response = await openmrsFetch<ConceptReferenceRangeResponse>(url);
  const conceptData = response.data?.results?.[0];

  if (!conceptData) {
    return undefined;
  }

  return {
    hiNormal: conceptData.hiNormal ?? null,
    hiAbsolute: conceptData.hiAbsolute ?? null,
    hiCritical: conceptData.hiCritical ?? null,
    lowNormal: conceptData.lowNormal ?? null,
    lowAbsolute: conceptData.lowAbsolute ?? null,
    lowCritical: conceptData.lowCritical ?? null,
  };
}

export function calculateInterpretation(
  value: string | number | object | undefined,
  range?: ObsReferenceRanges,
): ObservationInterpretation {
  if (!range || value === undefined || value === null || value === '') {
    return 'normal';
  }

  const numericValue =
    typeof value === 'string' ? Number.parseFloat(value) : typeof value === 'number' ? value : undefined;

  if (numericValue === undefined || Number.isNaN(numericValue)) {
    return 'normal';
  }

  if (Number.isNaN(numericValue)) {
    return 'normal';
  }

  if (range.hiAbsolute !== null && range.hiAbsolute !== undefined && numericValue > range.hiAbsolute) {
    return 'off_scale_high';
  }

  if (range.hiCritical !== null && range.hiCritical !== undefined && numericValue >= range.hiCritical) {
    return 'critically_high';
  }

  if (range.hiNormal !== null && range.hiNormal !== undefined && numericValue > range.hiNormal) {
    return 'high';
  }

  if (range.lowAbsolute !== null && range.lowAbsolute !== undefined && numericValue < range.lowAbsolute) {
    return 'off_scale_low';
  }

  if (range.lowCritical !== null && range.lowCritical !== undefined && numericValue <= range.lowCritical) {
    return 'critically_low';
  }

  if (range.lowNormal !== null && range.lowNormal !== undefined && numericValue < range.lowNormal) {
    return 'low';
  }

  return 'normal';
}

export function useConceptReferenceRanges(patientUuid: string | undefined, conceptUuids: string[]) {
  const stableConceptUuids = conceptUuids.filter(Boolean).sort();
  const shouldFetch = Boolean(patientUuid && stableConceptUuids.length > 0);
  const cacheKey = shouldFetch ? ['conceptReferenceRanges', patientUuid, stableConceptUuids.join(',')] : null;

  const { data, error, isLoading } = useSWRImmutable(cacheKey, async () => {
    const entries = await Promise.all(
      stableConceptUuids.map(
        async (conceptUuid) => [conceptUuid, await fetchReferenceRange(conceptUuid, patientUuid)] as const,
      ),
    );

    return Object.fromEntries(entries.filter(([, range]) => range !== undefined)) as Record<string, ObsReferenceRanges>;
  });

  return {
    referenceRangeMap: data ?? {},
    error,
    isLoading,
  };
}
