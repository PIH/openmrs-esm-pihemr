import { Type, validator } from '@openmrs/esm-framework';

/**
 *
 * In OpenMRS Microfrontends, all config parameters are optional. Thus,
 * all elements must have a reasonable default. A good default is one
 * that works well with the reference application.
 *
 * To understand the schema below, please read the configuration system
 * documentation:
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config
 * Note especially the section "How do I make my module configurable?"
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config?id=im-developing-an-esm-module-how-do-i-make-it-configurable
 * and the Schema Reference
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config?id=schema-reference
 */
export const configSchema = {
  pathologyEncTypeUUID: {
    _type: Type.String,
    _default: '70f18a24-92ec-4de5-acdc-7cae77414e32',
    _description: 'This is to determine the UUID of the Pathology encounterType in the instance',
  },
  healthCenterAttrTypeUUID: {
    _type: Type.String,
    _default: '8d87236c-c2cc-11de-8d13-0010c6dffd0f',
    _description: 'This is to determine the UUID of the Health center attribute type in the instance',
  },
  pathologyFullAllowedLocationUUID: {
    _type: Type.String,
    _default: 'a62fd59a-6577-43e0-b39c-ba42ac8cfbc9',
    _description: 'This is to determine the location allowed to view all other location data',
  },
  sampleStatusConceptUUID: {
    _type: Type.String,
    _default: '3adca58e-9334-4be5-9bd3-74f7bbf82776',
    _description: 'This is to determine the UUID of the sample status concept in the instance',
  },
  referralStatusConceptUUID: {
    _type: Type.String,
    _default: '5a7a931f-97b8-4d59-b0de-3a83603aaad9',
    _description: 'This is to determine the UUID of the referral status concept in the instance',
  },
  sampleDropOffconceptUUID: {
    _type: Type.String,
    _default: 'dc288e6c-84a4-4fd3-9136-ef9e13961b1e',
    _description: 'This is to determine the UUID of the sample drop off concept in the instance',
  },
  yesConceptUUID: {
    _type: Type.String,
    _default: '3cd6f600-26fe-102b-80cb-0017a47871b2',
    _description: 'This is to determine the UUID of the Yes concept in the instance',
  },
  yesConceptName: {
    _type: Type.String,
    _default: 'YES',
    _description: 'This is to determine the Name of the Yes concept in the instance',
  },

  pathologyResultsFromID: {
    _type: Type.Number,
    _default: 5613,
    _description: 'This is to determine the ID of the pathology results form in the instance',
  },
  pathologyResultsApprovedconceptUUID: {
    _type: Type.String,
    _default: '1f7742f0-4571-44d8-a88b-8bc60dc11e29',
    _description: 'This is to determine the pathology results approved concept uuid',
  },
  AccessionNumberconceptUUID: {
    _type: Type.String,
    _default: '0e466f59-8070-45b5-97d1-575ec5cfd85d',
    _description: 'This is to determine the Accession Number concept uuid',
  },
  DateBiopsySpecimenTakenconceptUUID: {
    _type: Type.String,
    _default: 'e0436a5b-dc19-4cb9-ac1b-acc005272c08',
    _description: 'This is to determine the Date Biopsy Specimen Taken concept uuid',
  },
  SpecimenSubmissionDateconceptUUID: {
    _type: Type.String,
    _default: '3928b7fc-b3ae-40a5-846f-d480120b04f6',
    _description: 'This is to determine the Specimen Submission Date concept uuid',
  },
  SendingPhysicianconceptUUID: {
    _type: Type.String,
    _default: '0a4a22db-0e82-4669-9aba-086d841505b5',
    _description: 'This is to determine the Sending Physician concept uuid',
  },
  OtherBiopsyLocationconceptUUID: {
    _type: Type.String,
    _default: '7c4650ee-45d5-435a-b968-511ef127a016',
    _description: 'This is to determine the Other Biopsy Location concept uuid',
  },
  OrganSystemconceptUUID: {
    _type: Type.String,
    _default: 'b88f9524-6b39-41b3-9b3a-f9a7a4b08fed',
    _description: 'This is to determine the Organ System concept uuid',
  },
  OrganconceptUUID: {
    _type: Type.String,
    _default: '488fe4a2-7903-41da-b21e-fb236a1ee356',
    _description: 'This is to determine the Organ concept uuid',
  },
  SpecimenDetailconceptUUID: {
    _type: Type.String,
    _default: 'e99170a5-f46b-490b-8fbb-bb9eacba3500',
    _description: 'This is to determine the Specimen Detail concept uuid',
  },
  OtherTestsOrProceduresconceptUUID: {
    _type: Type.String,
    _default: '66ad3230-59b2-4232-821e-a9ae86819e03',
    _description: 'This is to determine the Other tests or procedures concept uuid',
  },
  GrossDescriptionconceptUUID: {
    _type: Type.String,
    _default: '1e97a4d3-1691-4fb7-be78-18e526e82b0b',
    _description: 'This is to determine the Gross Description concept uuid',
  },
  MacroscopicExaminationconceptUUID: {
    _type: Type.String,
    _default: '5d149510-0767-4da7-82cd-be406b34877d',
    _description: 'This is to determine the Macroscopic Examination concept uuid',
  },
  COMMENTSATCONCLUSIONOFEXAMINATIONconceptUUID: {
    _type: Type.String,
    _default: '3cdc5938-26fe-102b-80cb-0017a47871b2',
    _description: 'This is to determine the COMMENTS AT CONCLUSION OF EXAMINATION concept uuid',
  },
  CanregCodeconceptUUID: {
    _type: Type.String,
    _default: '16931672-e068-4ea8-a89c-2ee7dbc07ad1',
    _description: 'This is to determine the Canreg Code concept uuid',
  },
  LabPhoneNumber: {
    _type: Type.String,
    _default: '0784433618',
    _descriptio: 'This is to determine the Lab contact number',
  },
  PathologyComment: {
    _type: Type.String,
    _default: 'e85305cf-ad93-4d1a-881e-53faf715fa8f',
    _descriptio: 'This is to determine the pathology Comment uuid',
  },
  numberOfRequestsPerPage: {
    _type: Type.Number,
    _default: 13,
    _description: 'This is to determine the number of requests per page',
  },
};

export type Config = {
  pathologyEncTypeUUID: string;
  healthCenterAttrTypeUUID: string;
  pathologyFullAllowedLocationUUID: string;
  sampleStatusConceptUUID: string;
  referralStatusConceptUUID: string;
  sampleDropOffconceptUUID: string;
  yesConceptUUID: string;
  yesConceptName: string;
  pathologyResultsFromID: number;
  pathologyResultsApprovedconceptUUID: string;

  AccessionNumberconceptUUID: string;
  DateBiopsySpecimenTakenconceptUUID: string;
  SpecimenSubmissionDateconceptUUID: string;
  SendingPhysicianconceptUUID: string;
  OtherBiopsyLocationconceptUUID: string;
  OrganSystemconceptUUID: string;
  OrganconceptUUID: string;
  SpecimenDetailconceptUUID: string;
  OtherTestsOrProceduresconceptUUID: string;
  GrossDescriptionconceptUUID: string;
  MacroscopicExaminationconceptUUID: string;
  COMMENTSATCONCLUSIONOFEXAMINATIONconceptUUID: string;
  CanregCodeconceptUUID: string;
  LabPhoneNumber: string;
  PathologyComment: string;
  numberOfRequestsPerPage: number;
};
