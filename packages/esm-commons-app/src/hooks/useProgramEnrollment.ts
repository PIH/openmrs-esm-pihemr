import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
const customRepresentation = `custom:(uuid,display,program,dateEnrolled,dateCompleted,location:(uuid,display))`;

export interface PatientProgram {
  uuid: string;
  program: {
    uuid: string;
  };
}

export const useActivePatientEnrollment = (patientUuid: string) => {
  const result = useSWR<{ data: { results: Array<PatientProgram> } }>(
    patientUuid ? `${restBaseUrl}/programenrollment?patient=${patientUuid}&v=${customRepresentation}` : null,
    openmrsFetch,
  );

  return result;
};
