import React from 'react';
import { render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import Root from './root.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseConfig = jest.mocked(useConfig);

function renderRoot(url = '/') {
  window.history.pushState({}, '', url);
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <Root />
    </SWRConfig>,
  );
}

describe('<Root />', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ patientChartUrl: '${openmrsSpaBase}/patient/${patientUuid}/chart' });
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/patient/patient-1')) {
        return Promise.resolve({
          data: { uuid: 'patient-1', display: 'Y2AHXV - Dave TestPatient', person: { display: 'Dave TestPatient' } },
        }) as ReturnType<typeof openmrsFetch>;
      }
      if (url.includes('/encounter/enc-1')) {
        return Promise.resolve({
          data: { uuid: 'enc-1', encounterType: { uuid: 'type-1', display: 'Oncology Consultation' } },
        }) as ReturnType<typeof openmrsFetch>;
      }
      return Promise.resolve({ data: { results: [] } }) as ReturnType<typeof openmrsFetch>;
    });
  });

  it('starts at the patient search', () => {
    renderRoot();

    expect(screen.getByText('Audit trail')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText(/enter a patient name or identifier/i)).toBeInTheDocument();
  });

  it("shows a patient's encounters when the url names a patient", async () => {
    renderRoot('/?patient=patient-1');

    expect(await screen.findByText('Dave TestPatient')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /include deleted encounters/i })).toBeInTheDocument();
  });

  it('shows the encounter audit trail when the url names an encounter', async () => {
    renderRoot('/?patient=patient-1&encounter=enc-1');

    expect(await screen.findByText('Encounter summary')).toBeInTheDocument();
    expect(screen.getByText('Observations')).toBeInTheDocument();
  });
});
