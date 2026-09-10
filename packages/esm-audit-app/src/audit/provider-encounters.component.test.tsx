import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { type AuditEncounter } from '../types';
import ProviderEncounters from './provider-encounters.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseConfig = jest.mocked(useConfig);

const provider = {
  uuid: 'prov-1',
  display: 'MCPRPG - Louidor Jean paul',
  identifier: 'MCPRPG',
  person: { uuid: 'person-1', display: 'Louidor Jean paul' },
};

/**
 * What the pihcore audit endpoint answers: whole encounters, paged, including the auditInfo that
 * names who entered each one. No second read per row, and no FHIR.
 */
const encounters: Array<AuditEncounter> = [
  {
    uuid: 'enc-1',
    encounterDatetime: '2026-04-18T09:00:00.000+0000',
    patient: { uuid: 'patient-1', display: 'Y2AHXV - Dave TestPatient' },
    encounterType: { uuid: 'type-1', display: 'Oncology Consultation' },
    form: { uuid: 'form-1', display: 'Oncology Consult Note' },
    location: { uuid: 'loc-1', display: 'Klinik Ekstèn' },
    auditInfo: { creator: { uuid: 'user-1', display: 'Cos John' }, dateCreated: '2026-04-18T09:05:00.000+0000' },
  },
  {
    uuid: 'enc-2',
    voided: true,
    encounterDatetime: '2026-04-11T08:00:00.000+0000',
    patient: { uuid: 'patient-2', display: 'Y2BQRS - Jean Baptiste' },
    encounterType: { uuid: 'type-2', display: 'Inscription' },
    auditInfo: { creator: { uuid: 'user-2', display: 'data.clerk' }, dateCreated: '2026-04-11T08:02:00.000+0000' },
  },
];

const encounterTypes = [
  { uuid: 'type-2', display: 'Inscription' },
  { uuid: 'type-1', display: 'Oncology Consultation' },
];

function mockRestApi({ results = encounters } = {}) {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    if (url.includes('/encountertype')) {
      return Promise.resolve({ data: { results: encounterTypes } }) as ReturnType<typeof openmrsFetch>;
    }
    if (url.includes('/pihcore/encounteraudit')) {
      return Promise.resolve({ data: { results, totalCount: results.length } }) as ReturnType<typeof openmrsFetch>;
    }
    return Promise.resolve({ data: provider }) as ReturnType<typeof openmrsFetch>;
  });
}

function renderProviderEncounters() {
  const onSelectEncounter = jest.fn();
  const onBackToSearch = jest.fn();
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <ProviderEncounters onBackToSearch={onBackToSearch} onSelectEncounter={onSelectEncounter} providerUuid="prov-1" />
    </SWRConfig>,
  );
  return { onSelectEncounter, onBackToSearch };
}

describe('<ProviderEncounters />', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ encountersPageSize: 10 });
    mockRestApi();
  });

  /**
   * The most recent audit search, decoded — `useOpenmrsPagination` rebuilds the url through `URL`.
   * The most recent one matters because a filter change issues another.
   */
  function auditSearchUrl() {
    const urls = mockOpenmrsFetch.mock.calls
      .map(([url]) => url as string)
      .filter((url) => url.includes('/encounteraudit'));
    return decodeURIComponent(urls[urls.length - 1] ?? '');
  }

  it('asks the pihcore audit endpoint which encounters name the provider', async () => {
    renderProviderEncounters();

    await screen.findByRole('cell', { name: 'Oncology Consultation' });
    expect(auditSearchUrl()).toContain('/ws/rest/v1/pihcore/encounteraudit?provider=prov-1');
    expect(auditSearchUrl()).toContain('&limit=10&startIndex=0&totalCount=true');
  });

  /**
   * One paged request per page: the endpoint returns whole encounters with their auditInfo, so
   * nothing further is read per row.
   */
  it('reads the page in a single request', async () => {
    renderProviderEncounters();

    await screen.findByRole('cell', { name: 'Oncology Consultation' });
    expect(mockOpenmrsFetch.mock.calls.filter(([url]) => (url as string).includes('/encounteraudit'))).toHaveLength(1);
    expect(mockOpenmrsFetch.mock.calls.some(([url]) => (url as string).includes('/encounter/'))).toBe(false);
  });

  it('lists them across patients, naming who entered each one', async () => {
    renderProviderEncounters();

    // The skeleton renders rows of its own, so wait for real content before reading the table.
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    const firstRow = screen.getAllByRole('row').find((row) => row.textContent?.includes('Dave TestPatient'));
    expect(firstRow).toHaveTextContent('Oncology Consultation');
    expect(firstRow).toHaveTextContent('Klinik Ekstèn');
    expect(firstRow).toHaveTextContent('Cos John');

    const secondRow = screen.getAllByRole('row').find((row) => row.textContent?.includes('Jean Baptiste'));
    expect(secondRow).toHaveTextContent('data.clerk');
    expect(secondRow).toHaveTextContent('Deleted');
  });

  it('is explicit that this is not the same as who changed the record', async () => {
    renderProviderEncounters();

    expect(await screen.findByText(/not the same as the ones they entered or changed/i)).toBeInTheDocument();
  });

  it('narrows the search on the server by encounter type', async () => {
    renderProviderEncounters();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Inscription' }));

    await waitFor(() => expect(auditSearchUrl()).toContain('&encounterType=type-2'));
    // the page goes back to the start, since a different filter is a different set of pages
    expect(auditSearchUrl()).toContain('&startIndex=0');
  });

  it('narrows the search on the server by encounter date', async () => {
    renderProviderEncounters();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    // the stubbed range picker parses its input as MM/DD/YYYY, hence the American-looking dates
    await userEvent.clear(screen.getByLabelText('Encounter date range'));
    await userEvent.type(screen.getByLabelText('Encounter date range'), '04/01/2026–04/30/2026');

    await waitFor(() => expect(auditSearchUrl()).toContain('startDate=2026-04-01&endDate=2026-04-30'));
  });

  it('says so when nothing matches the filters', async () => {
    renderProviderEncounters();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    mockRestApi({ results: [] });
    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Inscription' }));

    expect(await screen.findByText(/no encounters for this provider match these filters/i)).toBeInTheDocument();
  });

  it('drills down into the encounter that is clicked', async () => {
    const { onSelectEncounter } = renderProviderEncounters();
    await screen.findByRole('cell', { name: 'Oncology Consultation' });

    await userEvent.click(screen.getAllByRole('button', { name: /2026/ })[0]);

    expect(onSelectEncounter).toHaveBeenCalledWith('enc-1');
  });

  it('goes back to the provider search', async () => {
    const { onBackToSearch } = renderProviderEncounters();

    await userEvent.click(screen.getByRole('button', { name: /back to provider search/i }));

    expect(onBackToSearch).toHaveBeenCalled();
  });

  it('says so when the provider is on no encounters', async () => {
    mockRestApi({ results: [] });
    renderProviderEncounters();

    expect(await screen.findByText(/not recorded on any encounters/i)).toBeInTheDocument();
  });
});
