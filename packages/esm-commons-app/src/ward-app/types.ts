import type { DefaultWorkspaceProps, Patient, Visit } from '@openmrs/esm-framework';

// a stripped down version of the same type defined in esm-ward-app
export type WardPatient = {
  patient: Patient;
  visit: Visit;
};

export interface WardPatientWorkspaceProps extends DefaultWorkspaceProps {
  wardPatient: WardPatient;
}
