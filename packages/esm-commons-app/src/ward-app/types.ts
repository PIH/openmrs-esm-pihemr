import type { Patient, Visit, Location, Workspace2DefinitionProps } from '@openmrs/esm-framework';

// stripped down versions of the same types defined in esm-ward-app

export type WardPatient = {
  patient: Patient;
  visit: Visit;
  inpatientAdmission: InpatientAdmission;
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
export interface InpatientAdmission {
  currentInpatientLocation: Location;
  // other fields not typed
}
