/**
 * This is the config schema. In OpenMRS Microfrontends, all config parameters
 * are optional, so every element must have a reasonable default. See the
 * configuration system documentation:
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config
 */
import { Type, validators } from '@openmrs/esm-framework';

export const configSchema = {
  patientSearchPageSize: {
    _type: Type.Number,
    _description: 'How many patients to show per page of patient search results.',
    _default: 10,
    _validators: [validators.inRange(1, 100)],
  },
  encountersPageSize: {
    _type: Type.Number,
    _description: "How many encounters to show per page of a patient's encounter list.",
    _default: 10,
    _validators: [validators.inRange(1, 100)],
  },
  patientChartUrl: {
    _type: Type.String,
    _description:
      'The URL of the patient chart to link to from the audit trail. May contain the ' +
      'template variables ${openmrsSpaBase}, ${openmrsBase} and ${patientUuid}.',
    _default: '${openmrsSpaBase}/patient/${patientUuid}/chart',
    _validators: [validators.isUrlWithTemplateParameters(['patientUuid'])],
  },
};

export interface Config {
  patientSearchPageSize: number;
  encountersPageSize: number;
  patientChartUrl: string;
}
