import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { type AuditEncounter, type AuditObs } from '../types';
import EncounterAudit from './encounter-audit.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseConfig = jest.mocked(useConfig);

const encounterCreated = '2026-09-01T11:09:00.000+0000';
const dayAfterEncounter = '2026-09-02T08:30:00.000+0000';
const creator = { uuid: 'user-1', display: 'Cos John' };

const mockEncounter: AuditEncounter = {
  uuid: 'enc-1',
  display: 'COVID-19 Admission',
  encounterDatetime: encounterCreated,
  voided: false,
  patient: {
    uuid: 'patient-1',
    display: 'Y2AHXV - Dave TestPatient',
    identifiers: [{ uuid: 'id-1', identifier: 'Y2AHXV', preferred: true }],
  },
  location: { uuid: 'loc-1', display: 'CDI Klinik Ekstèn Jeneral' },
  form: { uuid: 'form-1', display: 'COVID19 Admission', version: '1.0' },
  encounterType: { uuid: 'type-1', display: 'COVID-19 Admission' },
  visit: { uuid: 'visit-1', display: 'Clinic or Hospital Visit' },
  encounterProviders: [
    {
      uuid: 'ep-1',
      voided: false,
      provider: { uuid: 'prov-1', display: 'Louidor Jean paul', identifier: 'MCPRPG' },
      encounterRole: { uuid: 'role-1', display: 'Consulting Clinician' },
    },
  ],
  auditInfo: { creator, dateCreated: encounterCreated },
};

const mockObs: Array<AuditObs> = [
  {
    uuid: 'obs-worker',
    concept: { uuid: 'concept-worker', display: 'Health care worker' },
    formFieldPath: 'covid.1-worker',
    value: { uuid: 'concept-yes', display: 'Yes' },
    auditInfo: { creator, dateCreated: encounterCreated },
  },
  {
    uuid: 'obs-pulse-new',
    concept: { uuid: 'concept-pulse', display: 'Pulse' },
    formFieldPath: 'covid.2-pulse',
    value: 68,
    previousVersion: { uuid: 'obs-pulse-old', display: 'Pulse: 67' },
    auditInfo: { creator, dateCreated: dayAfterEncounter },
  },
  {
    uuid: 'obs-pulse-old',
    concept: { uuid: 'concept-pulse', display: 'Pulse' },
    formFieldPath: 'covid.2-pulse',
    value: 67,
    voided: true,
    auditInfo: {
      creator,
      dateCreated: encounterCreated,
      voidedBy: creator,
      dateVoided: dayAfterEncounter,
      voidReason: 'Corrected the reading',
    },
  },
  {
    uuid: 'obs-systolic',
    concept: { uuid: 'concept-systolic', display: 'Systolic' },
    formFieldPath: 'covid.3-systolic',
    value: 123,
    auditInfo: { creator, dateCreated: dayAfterEncounter },
  },
  {
    uuid: 'obs-symptom-group',
    concept: { uuid: 'concept-symptom-group', display: 'Sign/Symptom construct' },
    formFieldPath: 'covid.4-symptom',
    auditInfo: { creator, dateCreated: encounterCreated },
  },
  {
    uuid: 'obs-symptom',
    concept: { uuid: 'concept-symptom', display: 'Sign/Symptom name' },
    obsGroup: { uuid: 'obs-symptom-group' },
    value: { uuid: 'concept-fever', display: 'Fever' },
    auditInfo: { creator, dateCreated: encounterCreated },
  },
];

function mockRestApi({ encounter = mockEncounter, obs = mockObs } = {}) {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    if (url.includes('/obs?')) {
      return Promise.resolve({ data: { results: obs } }) as ReturnType<typeof openmrsFetch>;
    }
    return Promise.resolve({ data: encounter }) as ReturnType<typeof openmrsFetch>;
  });
}

function renderEncounterAudit() {
  const onBackToEncounters = jest.fn();
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <EncounterAudit encounterUuid="enc-1" onBackToEncounters={onBackToEncounters} />
    </SWRConfig>,
  );
  return onBackToEncounters;
}

function obsRowsFor(conceptName: string): Array<HTMLElement> {
  return screen.getAllByRole('row').filter((row) => row.textContent?.startsWith(conceptName));
}

describe('<EncounterAudit />', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ patientChartUrl: '${openmrsSpaBase}/patient/${patientUuid}/chart' });
    mockRestApi();
  });

  it('summarises how the encounter was recorded', async () => {
    renderEncounterAudit();

    expect(await screen.findByText('CDI Klinik Ekstèn Jeneral')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Y2AHXV - Dave TestPatient' })).toHaveAttribute(
      'href',
      '/openmrs/spa/patient/patient-1/chart',
    );
    expect(screen.getByText('Y2AHXV')).toBeInTheDocument();
    expect(screen.getByText('COVID19 Admission v1.0')).toBeInTheDocument();
    expect(screen.getByText('Clinic or Hospital Visit')).toBeInTheDocument();
    const createdByRow = screen.getAllByRole('row').find((row) => row.textContent?.startsWith('Created by'));
    expect(createdByRow).toHaveTextContent('Cos John');
  });

  it('lists the providers on the encounter', async () => {
    renderEncounterAudit();

    const providerRow = (await screen.findAllByRole('row')).find((row) =>
      row.textContent?.includes('Louidor Jean paul'),
    );
    expect(providerRow).toHaveTextContent('Consulting Clinician');
    expect(providerRow).toHaveTextContent('MCPRPG');
  });

  it('shows an edited obs above the value it replaced', async () => {
    renderEncounterAudit();
    await screen.findByText('CDI Klinik Ekstèn Jeneral');

    const pulseRows = obsRowsFor('Pulse');
    expect(pulseRows).toHaveLength(2);
    expect(pulseRows[0]).toHaveTextContent('68');
    expect(pulseRows[0]).toHaveTextContent('Edited');
    expect(pulseRows[0]).toHaveTextContent('was 67');
    expect(pulseRows[1]).toHaveTextContent('67');
    expect(pulseRows[1]).toHaveTextContent('Previous value');
    expect(pulseRows[1]).toHaveTextContent('Corrected the reading');
  });

  it('flags an obs recorded after the encounter was created, and leaves the rest unflagged', async () => {
    renderEncounterAudit();
    await screen.findByText('CDI Klinik Ekstèn Jeneral');

    expect(obsRowsFor('Systolic')[0]).toHaveTextContent('Added later');

    const workerRow = obsRowsFor('Health care worker')[0];
    expect(workerRow).toHaveTextContent('Yes');
    expect(workerRow).not.toHaveTextContent('Added later');
    expect(workerRow).not.toHaveTextContent('Edited');
  });

  it('nests obs group members under their group', async () => {
    renderEncounterAudit();
    await screen.findByText('CDI Klinik Ekstèn Jeneral');

    expect(obsRowsFor('Sign/Symptom construct')).toHaveLength(1);
    expect(obsRowsFor('Sign/Symptom name')[0]).toHaveTextContent('Fever');
  });

  it('hides deleted observations on request', async () => {
    renderEncounterAudit();
    await screen.findByText('CDI Klinik Ekstèn Jeneral');
    expect(obsRowsFor('Pulse')).toHaveLength(2);

    await userEvent.click(screen.getByRole('checkbox', { name: /show deleted observations/i }));

    expect(obsRowsFor('Pulse')).toHaveLength(1);
    expect(obsRowsFor('Pulse')[0]).toHaveTextContent('68');
  });

  it('shows concept descriptions on request', async () => {
    mockRestApi({
      obs: [
        {
          ...mockObs[0],
          concept: {
            uuid: 'concept-worker',
            display: 'Health care worker',
            descriptions: [{ description: 'Whether the patient works in health care', locale: 'en' }],
          },
        },
      ],
    });
    renderEncounterAudit();
    await screen.findByText('CDI Klinik Ekstèn Jeneral');

    expect(screen.queryByText(/whether the patient works in health care/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /show concept descriptions/i }));

    expect(screen.getByText(/whether the patient works in health care/i)).toBeInTheDocument();
  });

  it('warns that a deleted encounter is being audited', async () => {
    mockRestApi({
      encounter: {
        ...mockEncounter,
        voided: true,
        auditInfo: {
          ...mockEncounter.auditInfo,
          voidedBy: creator,
          dateVoided: dayAfterEncounter,
          voidReason: 'Entered on the wrong patient',
        },
      },
    });
    renderEncounterAudit();

    expect(await screen.findByText(/this encounter has been deleted/i)).toBeInTheDocument();
    expect(screen.getByText('Entered on the wrong patient')).toBeInTheDocument();
  });

  it('walks back up to the patient the encounter belongs to', async () => {
    const onBackToEncounters = renderEncounterAudit();
    await screen.findByText('CDI Klinik Ekstèn Jeneral');

    await userEvent.click(screen.getByRole('button', { name: /back to encounters/i }));

    expect(onBackToEncounters).toHaveBeenCalledWith('patient-1');
  });
});
