import { Type, validators } from '@openmrs/esm-framework';

/**
 * This is the config schema. It expects a configuration object which
 * looks like this:
 *
 * ```json
 * { "casualGreeting": true, "whoToGreet": ["Mom"] }
 * ```
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
  links: {
    patientDash: {
      _type: Type.String,
      _default:
        '${openmrsBase}/coreapps/clinicianfacing/patient.page?patientId=${patientUuid}&app=pih.app.clinicianDashboard',
      _validators: [validators.isUrlWithTemplateParameters(['patientUuid'])],
    },
    visitPage: {
      _type: Type.String,
      _default:
        '${openmrsBase}/pihcore/visit/visit.page?patient=${patientUuid}&visit=${visitUuid}&suppressActions=true#/overview',
      _validators: [validators.isUrlWithTemplateParameters(['patientUuid', 'visitUuid'])],
    },
    homeVisitForm: {
      _type: Type.String,
      _default:
        '${openmrsBase}/htmlformentryui/htmlform/editHtmlFormWithStandardUi.page?patientId=${patientUuid}&visitId=${visitUuid}&encounterId=${encounterUuid}&definitionUiResource=file:configuration/pih/htmlforms/section-mch-referral.xml&returnUrl=${openmrsSpaBase}/referrals-queue',
      _validators: [validators.isUrlWithTemplateParameters(['patientUuid', 'visitUuid', 'encounterUuid'])],
    },
  },
  pendingStatusConceptUuids: {
    _type: Type.Array,
    _description:
      'UUIDs of the fulfillment status concepts whose referrals still need action. Their status links to the referral form.',
    _default: [
      '162866AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Pending status
      '160068AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Referral unmet
    ],
    _elements: {
      _type: Type.ConceptUuid,
    },
  },
  pendingStatuses: {
    _type: Type.Array,
    _description:
      'Fallback for reports that do not return fulfillment_status_uuid: names of the pending fulfillment statuses. ' +
      'Only matches when the status name is in this language, so prefer pendingStatusConceptUuids.',
    _default: ['Pending status', 'Referral unmet'],
    _elements: {
      _type: Type.String,
    },
  },
};

export type Config = {
  // TODO
};
