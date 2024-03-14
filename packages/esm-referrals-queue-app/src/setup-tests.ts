import '@testing-library/jest-dom/extend-expect';

jest.mock('@openmrs/esm-framework', () => {
  const originalModule = jest.requireActual('@openmrs/esm-framework');

  return {
    ...originalModule,
    useConfig: jest.fn(() => {
      return {
        links: {
          patientDash:
            '${openmrsBase}/coreapps/clinicianfacing/patient.page?patientId=${patientUuid}&app=pih.app.clinicianDashboard',
          visitPage:
            '${openmrsBase}/pihcore/visit/visit.page?patient=${patientUuid}&visit=${visitUuid}&suppressActions=true#/overview',
          homeVisitForm:
            '${openmrsBase}/htmlformentryui/htmlform/editHtmlFormWithStandardUi.page?patientId=${patientUuid}&visitId=${visitUuid}&encounterId=${encounterUuid}&definitionUiResource=file:configuration/pih/htmlforms/section-mch-referral.xml&returnUrl=/mirebalais/spa/referrals-queue',
        },
        pendingStatuses: ['Pending status', 'Referral unmet'],
      };
    }),
  };
});

window.getOpenmrsSpaBase = () => 'openmrs/spa';
