// Minimal interfaces — mirror the relevant fields from the dispensing app's types
// without introducing a hard dependency on that module.
export interface MedicationDispense {
  id?: string;
  status?: string;
  medicationReference?: { display?: string };
  quantity?: { value?: number; unit?: string };
  whenHandedOver?: string;
}

export interface MedicationRequestBundle {
  request: { id?: string; medicationReference?: { display?: string } };
  dispenses: Array<MedicationDispense>;
}

export const COMPLETED_STATUS = 'completed';
