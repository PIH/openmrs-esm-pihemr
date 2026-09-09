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
  patientDashboardUrl: {
    _type: Type.String,
    _description:
      "The dashboard the patient's name in the encounter audit links to. This is the OpenMRS 2.x " +
      'clinician dashboard rather than a page in this app, so it is a full page load. May contain ' +
      'the template variables ${openmrsBase}, ${openmrsSpaBase} and ${patientUuid}.',
    _default: '${openmrsBase}/pihcore/router/programDashboard.page?patientId=${patientUuid}',
    _validators: [validators.isUrlWithTemplateParameters(['patientUuid'])],
  },
};

export interface Config {
  patientSearchPageSize: number;
  encountersPageSize: number;
  patientDashboardUrl: string;
}
