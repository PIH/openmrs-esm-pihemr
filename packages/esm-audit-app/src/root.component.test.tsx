import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import Root from './root.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

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
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/patient/patient-1')) {
        return Promise.resolve({
          data: { uuid: 'patient-1', display: 'Y2AHXV - Dave TestPatient', person: { display: 'Dave TestPatient' } },
        }) as ReturnType<typeof openmrsFetch>;
      }
      if (url.includes('/obsaudit?')) {
        return Promise.resolve({ data: { results: [] } }) as ReturnType<typeof openmrsFetch>;
      }
      if (url.includes('/user/user-1')) {
        return Promise.resolve({
          data: { uuid: 'user-1', display: 'butch', username: 'butch', person: { display: 'Cos John' } },
        }) as ReturnType<typeof openmrsFetch>;
      }
      if (url.includes('/provider/prov-1')) {
        return Promise.resolve({
          data: { uuid: 'prov-1', display: 'MCPRPG - Louidor Jean paul', identifier: 'MCPRPG' },
        }) as ReturnType<typeof openmrsFetch>;
      }
      if (url.includes('/encounteraudit')) {
        return Promise.resolve({ data: { results: [], totalCount: 0 } }) as ReturnType<typeof openmrsFetch>;
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

  it('can search by user instead', async () => {
    renderRoot();

    await userEvent.click(screen.getByRole('tab', { name: 'Users' }));

    expect(screen.getByText(/enter a name or username/i)).toBeInTheDocument();
  });

  it("shows a user's modified encounters when the url names a user", async () => {
    renderRoot('/?user=user-1');

    expect(await screen.findByText('Cos John')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to user search/i })).toBeInTheDocument();
  });

  it('can search by provider instead', async () => {
    renderRoot();

    await userEvent.click(screen.getByRole('tab', { name: 'Providers' }));

    expect(screen.getByText(/enter a provider name or identifier/i)).toBeInTheDocument();
  });

  it("shows a provider's encounters when the url names a provider", async () => {
    renderRoot('/?provider=prov-1');

    expect(await screen.findByText('MCPRPG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to provider search/i })).toBeInTheDocument();
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
