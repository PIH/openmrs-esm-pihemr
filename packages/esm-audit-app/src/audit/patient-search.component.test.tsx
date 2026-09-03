import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import PatientSearch from './patient-search.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

const mockPatients = [
  {
    uuid: 'patient-1',
    display: 'Y2AHXV - Dave TestPatient',
    identifiers: [{ uuid: 'id-1', identifier: 'Y2AHXV', preferred: true }],
    person: { display: 'Dave TestPatient', gender: 'M', age: 42, birthdate: '1984-03-14T00:00:00.000+0000' },
  },
];

function renderPatientSearch() {
  const onSelectPatient = jest.fn();
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <PatientSearch onSelectPatient={onSelectPatient} />
    </SWRConfig>,
  );
  return onSelectPatient;
}

describe('<PatientSearch />', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: mockPatients, totalCount: 1 },
    } as unknown as ReturnType<typeof openmrsFetch>);
  });

  it('asks for a search term before searching', () => {
    renderPatientSearch();

    expect(screen.getByText(/enter a patient name or identifier/i)).toBeInTheDocument();
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('searches patients by name or identifier and lists what it finds', async () => {
    renderPatientSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'Y2AHXV');

    expect(await screen.findByRole('button', { name: 'Dave TestPatient' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Y2AHXV' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '42' })).toBeInTheDocument();
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/ws/rest/v1/patient?q=Y2AHXV'));
  });

  it('drills down into the patient that is clicked', async () => {
    const onSelectPatient = renderPatientSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'Y2AHXV');
    await userEvent.click(await screen.findByRole('button', { name: 'Dave TestPatient' }));

    expect(onSelectPatient).toHaveBeenCalledWith('patient-1');
  });

  it('says so when nothing matches', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [], totalCount: 0 } } as unknown as ReturnType<
      typeof openmrsFetch
    >);
    renderPatientSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'nobody');

    expect(await screen.findByText(/no patients match "nobody"/i)).toBeInTheDocument();
  });
});
