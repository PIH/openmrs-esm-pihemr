import type { Patient, Visit, Workspace2DefinitionProps } from '@openmrs/esm-framework';

// stripped down versions of the same types defined in esm-ward-app

export type WardPatient = {
  patient: Patient;
  visit: Visit;
  // other fields not typed
};

export type WardPatientWorkspaceDefinition = Workspace2DefinitionProps<{}, {}, { wardPatient: WardPatient }>;

export interface PatientAndAdmission {
  patient: Patient;
  // other fields not typed
}

export interface MotherChildRelationships {
  motherByChildUuid: Map<string, PatientAndAdmission>;
  childrenByMotherUuid: Map<string, PatientAndAdmission[]>;
  isLoading: boolean;
}

export interface MaternalWardViewContext {
  motherChildRelationships: MotherChildRelationships;
}
