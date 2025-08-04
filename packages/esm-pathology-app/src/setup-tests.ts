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
        },
      };
    }),
  };
});

window.getOpenmrsSpaBase = () => 'openmrs/spa';
