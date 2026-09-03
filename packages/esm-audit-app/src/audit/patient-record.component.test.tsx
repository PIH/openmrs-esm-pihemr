import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { type AuditEncounter, type AuditPatient } from '../types';
import PatientRecord from './patient-record.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseConfig = jest.mocked(useConfig);

const mockPatient: AuditPatient = {
  uuid: 'patient-1',
  display: 'Y2AHXV - Dave TestPatient',
  identifiers: [{ uuid: 'id-1', identifier: 'Y2AHXV', preferred: true }],
  person: { display: 'Dave TestPatient', gender: 'M', age: 42, birthdate: '1984-03-14T00:00:00.000+0000' },
};

const consultation: AuditEncounter = {
  uuid: 'enc-1',
  encounterDatetime: '2026-04-18T09:00:00.000+0000',
  voided: false,
  encounterType: { uuid: 'type-1', display: 'Oncology Consultation' },
  form: { uuid: 'form-1', display: 'Oncology Consult Note' },
  location: { uuid: 'loc-1', display: 'Klinik Ekstèn' },
  encounterProviders: [{ uuid: 'ep-1', provider: { uuid: 'prov-1', display: 'Louidor Jean paul' } }],
};

const deletedCheckin: AuditEncounter = {
  uuid: 'enc-2',
  encounterDatetime: '2026-04-11T08:00:00.000+0000',
  voided: true,
  encounterType: { uuid: 'type-2', display: 'Inscription' },
  form: { uuid: 'form-2', display: 'LiveCheckin' },
  location: { uuid: 'loc-2', display: 'CDI Klinik Ekstèn Jeneral' },
  patient: { uuid: 'patient-1', display: 'Y2AHXV - Dave TestPatient' },
};

/** The free-text encounter search matches on identifier, so it can return other patients' rows. */
const otherPatientsEncounter: AuditEncounter = {
  uuid: 'enc-3',
  encounterDatetime: '2026-05-01T08:00:00.000+0000',
  voided: false,
  encounterType: { uuid: 'type-3', display: 'Consultation' },
  patient: { uuid: 'patient-2', display: 'Y2AHXV2 - Someone Else' },
};

/**
 * The encounter list is the only read that asks for a total count; the unfiltered scan behind the
 * encounter-type dropdown and the activity view reads the same endpoint without one.
 */
function mockRestApi({ pagedEncounters = [consultation] }: { pagedEncounters?: Array<AuditEncounter> } = {}) {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    if (url.includes('/patient/patient-1')) {
      return Promise.resolve({ data: mockPatient }) as ReturnType<typeof openmrsFetch>;
    }
    if (url.includes('/obs?encounter=')) {
      return Promise.resolve({ data: { results: [] } }) as ReturnType<typeof openmrsFetch>;
    }
    if (url.includes('/encounter?q=')) {
      return Promise.resolve({
        data: {
          results: [{ ...consultation, patient: deletedCheckin.patient }, deletedCheckin, otherPatientsEncounter],
        },
      }) as ReturnType<typeof openmrsFetch>;
    }
    if (url.includes('totalCount=true')) {
      return Promise.resolve({
        data: { results: pagedEncounters, totalCount: pagedEncounters.length },
      }) as ReturnType<typeof openmrsFetch>;
    }
    return Promise.resolve({ data: { results: [consultation, deletedCheckin] } }) as ReturnType<typeof openmrsFetch>;
  });
}

function renderPatientRecord() {
  const onSelectEncounter = jest.fn();
  const onBackToSearch = jest.fn();
  const onSelectView = jest.fn();
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <PatientRecord
        onBackToSearch={onBackToSearch}
        onSelectEncounter={onSelectEncounter}
        onSelectView={onSelectView}
        patientUuid="patient-1"
        view="encounters"
      />
    </SWRConfig>,
  );
  return { onSelectEncounter, onBackToSearch, onSelectView };
}

describe('<PatientRecord />', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      patientChartUrl: '${openmrsSpaBase}/patient/${patientUuid}/chart',
    });
    mockRestApi();
  });

  it("lists the patient's encounters, without the deleted ones", async () => {
    renderPatientRecord();

    expect(await screen.findByText('Dave TestPatient')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Oncology Consultation' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Louidor Jean paul' })).toBeInTheDocument();
    expect(screen.queryByText('LiveCheckin')).not.toBeInTheDocument();
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/ws/rest/v1/encounter?patient=patient-1'));
  });

  it('includes deleted encounters on request, and only this patient’s', async () => {
    renderPatientRecord();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    await userEvent.click(screen.getByRole('checkbox', { name: /include deleted encounters/i }));

    expect(await screen.findByRole('cell', { name: 'LiveCheckin' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Consultation' })).not.toBeInTheDocument();
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('/ws/rest/v1/encounter?q=Y2AHXV&includeAll=true'),
    );

    const deletedRow = screen.getAllByRole('row').find((row) => row.textContent?.includes('LiveCheckin'));
    expect(deletedRow).toHaveTextContent('Deleted');
  });

  it('drills down into the encounter that is clicked', async () => {
    const { onSelectEncounter } = renderPatientRecord();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    await userEvent.click(screen.getAllByRole('button', { name: /2026/ })[0]);

    expect(onSelectEncounter).toHaveBeenCalledWith('enc-1');
  });

  it("offers only the encounter types this patient's encounters use", async () => {
    renderPatientRecord();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));

    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Inscription', 'Oncology Consultation']);
  });

  it('asks the server for one encounter type when one is chosen', async () => {
    renderPatientRecord();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Inscription' }));

    await waitFor(() =>
      expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('&encounterType=type-2')),
    );
  });

  it('offers to clear the filters once one is set, and says when nothing matches', async () => {
    renderPatientRecord();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

    mockRestApi({ pagedEncounters: [] });

    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Inscription' }));

    expect(await screen.findByText(/no encounters match these filters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it('goes back to the patient search', async () => {
    const { onBackToSearch } = renderPatientRecord();

    await userEvent.click(screen.getByRole('button', { name: /back to patient search/i }));

    expect(onBackToSearch).toHaveBeenCalled();
  });

  it('switches to the record activity view', async () => {
    const { onSelectView } = renderPatientRecord();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    await userEvent.click(screen.getByRole('tab', { name: /patient activity/i }));

    expect(onSelectView).toHaveBeenCalledWith('activity');
  });
});
