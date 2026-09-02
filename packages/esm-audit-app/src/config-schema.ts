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
  activityScanLimit: {
    _type: Type.Number,
    _description:
      "How many of a patient's most recent encounters the record activity view reads observations " +
      'from. Each encounter costs one request, so this bounds how much work a scan can do.',
    _default: 50,
    _validators: [validators.inRange(1, 200)],
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
  activityScanLimit: number;
  patientSearchPageSize: number;
  encountersPageSize: number;
  patientChartUrl: string;
}
