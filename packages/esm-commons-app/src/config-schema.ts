import { Type } from '@openmrs/esm-framework';

/**
 * In OpenMRS Microfrontends, all config parameters are optional.
 * Reasonable defaults are required so the app works in the reference application.
 */
export const configSchema = {
  concepts: {
    hemoglobinUuid: {
      _type: Type.ConceptUuid,
      _default: '3ccc7158-26fe-102b-80cb-0017a47871b2',
      _description: 'UUID for the Hemoglobin concept',
    },
    glucoseUuid: {
      _type: Type.ConceptUuid,
      _default: '0e9d36ab-ccfe-4716-9060-ad5f330a28af',
      _description: 'UUID for the Glucose concept',
    },
    fhrUuid: {
      _type: Type.ConceptUuid,
      _default: '1440AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      _description: 'UUID for the Fetal heart rate concept',
    },
    secondFhrUuid: {
      _type: Type.ConceptUuid,
      _default: 'fee3bcb1-209e-4eb2-9204-fbf7ca4a05d1',
      _description: 'UUID for the Heart beat of 2nd fetus concept',
    },
  },
};

export interface ConfigObject {
  concepts: {
    hemoglobinUuid: string;
    glucoseUuid: string;
    fhrUuid: string;
  };
}
