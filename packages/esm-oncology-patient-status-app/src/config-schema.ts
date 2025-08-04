import { Type } from "@openmrs/esm-framework";

export const configSchema = {
  diagnosisWorkflowConceptUuid: {
    _type: Type.ConceptUuid,
    _default: "226ed7ad-b776-4b99-966d-fd818d3302c2",
    _description: "Uuid of a concept connected to the diagnosis workflow",
  },
  oncologyProgramName: {
    _type: Type.String,
    _default: "Oncology Program",
    _description: "Name of the oncology program",
  },
  stageConceptUuid: {
    _type: Type.ConceptUuid,
    _default: "e9cf4aed-34be-4c0a-9004-4294d9bb2d74",
    _description: "Uuid of stage concept",
  },
  treatmentPlanConceptUuid: {
    _type: Type.ConceptUuid,
    _default: "3cda0160-26fe-102b-80cb-0017a47871b2",
    _description: "Uuid of treatment plan concept",
  },
  nextVisitConceptUuids: {
    _type: Type.Array,
    _default: [
      "8eba01f9-2ea0-49d0-b61b-8d6001e2ff7b",
      "8c3b045a-aa94-4361-b2e9-8a80c26ccede",
      "5efb51db-4e71-497d-822c-91501ac167f6",
      "bf79952c-4c49-47aa-b8dc-bb4195e734c0",
      "ff20420e-745b-4d99-92a0-dea681b9493d",
      "a7aa7d20-3520-4d8a-9324-f7b8f6a3b109",
      "7ec61380-3cde-4b7a-a322-4678a0b460c4",
      "56001c5f-1a8a-4d80-b255-d1de983a852e",
      "ea843dde-d33b-4687-88cb-5cd76111b48b",
      "6de4e3ee-fe8d-427e-b38f-1703e80f8513",
    ],
    _description: "Uuid of all next visit concept to be considered",
    _elements: { _type: Type.String },
  },
};

export interface PatientStatusWidgetConfig {
  diagnosisWorkflowConceptUuid: string;
  oncologyProgramName: string;
  stageConceptUuid: string;
  treatmentPlanConceptUuid: string;
  nextVisitConceptUuids: Array<string>;
}
