import { restBaseUrl, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { type Encounter } from '../service-queues-app/types';

interface EncounterSearchParams {
  patient: string;
  visit?: string;
  encounterType?: string;
}

export function useEncounters(params: EncounterSearchParams) {
  const url = `${restBaseUrl}/encounter?`;
  const searchParams = new URLSearchParams();
  searchParams.append('patient', params.patient);
  if (params.visit) {
    searchParams.append('visit', params.visit);
  }
  if (params.encounterType) {
    searchParams.append('encounterType', params.encounterType);
  }

  return useOpenmrsFetchAll<Encounter>(url + searchParams.toString());
}
