import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import UserEncounters from './user-encounters.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseConfig = jest.mocked(useConfig);

const user = {
  uuid: 'user-1',
  display: 'butch',
  username: 'butch',
  person: { uuid: 'person-1', display: 'Cos John' },
};

/**
 * Strictly descending timestamps, so observation 0 is the most recent change — which is the order
 * the audit endpoint returns and the order the merge relies on.
 */
const scanEpoch = Date.UTC(2026, 8, 1, 12, 0, 0);

function dayFromIndex(index: number): string {
  return new Date(scanEpoch - index * 60000).toISOString();
}

/** Alternating types, so filtering by one keeps every other encounter. */
const consultationType = { uuid: 'type-consultation', display: 'Consultation' };
const vitalsType = { uuid: 'type-vitals', display: 'Vitals' };

/** A type nothing in the trail uses, since the dropdown offers every type in the system. */
const unusedType = { uuid: 'type-unused', display: 'Zibra Admission' };

function encounter(index: number) {
  return {
    uuid: `enc-${index}`,
    encounterDatetime: '2026-04-18T09:00:00.000+0000',
    encounterType: index % 2 === 0 ? consultationType : vitalsType,
    location: { uuid: 'loc-1', display: 'Klinik Ekstèn' },
    patient: { uuid: `patient-${index}`, display: `Patient ${index}` },
  };
}

/**
 * Observations newest first, `obsPerEncounter` of them on each encounter — the shape a form-entered
 * record has, and the one that makes discovering ten encounters cost more than ten observations.
 */
function createdObsPage(startIndex: number, count: number, obsPerEncounter: number) {
  return Array.from({ length: count }, (_, offset) => {
    const index = startIndex + offset;
    return {
      uuid: `obs-${index}`,
      encounter: encounter(Math.floor(index / obsPerEncounter)),
      auditInfo: { dateCreated: dayFromIndex(index) },
    };
  });
}

function startIndexOf(url: string): number {
  return Number(/startIndex=(\d+)/.exec(url)?.[1] ?? 0);
}

function limitOf(url: string): number {
  return Number(/limit=(\d+)/.exec(url)?.[1] ?? 100);
}

/**
 * Serves `totalCreated` observations, honouring the startIndex and limit asked for — a page shorter
 * than the limit is what tells the client the search is exhausted, so the mock must not invent one.
 */
function mockRestApi({ totalCreated = 250, obsPerEncounter = 20 } = {}) {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    if (url.includes('/obsaudit?') && url.includes('createdBy=')) {
      const start = startIndexOf(url);
      const count = Math.max(0, Math.min(limitOf(url), totalCreated - start));
      return Promise.resolve({
        data: { results: createdObsPage(start, count, obsPerEncounter) },
      }) as ReturnType<typeof openmrsFetch>;
    }
    if (url.includes('/obsaudit?') && url.includes('voidedBy=')) {
      return Promise.resolve({ data: { results: [] } }) as ReturnType<typeof openmrsFetch>;
    }
    if (url.includes('/encountertype')) {
      // deliberately unsorted, and including a type the trail does not use
      return Promise.resolve({
        data: { results: [vitalsType, unusedType, consultationType] },
      }) as ReturnType<typeof openmrsFetch>;
    }
    if (url.includes('/obs?encounter=')) {
      return Promise.resolve({
        data: { results: [{ uuid: 'o1', auditInfo: { creator: { uuid: 'user-1' } } }] },
      }) as ReturnType<typeof openmrsFetch>;
    }
    return Promise.resolve({ data: user }) as ReturnType<typeof openmrsFetch>;
  });
}

function renderUserEncounters() {
  const onSelectEncounter = jest.fn();
  const onBackToSearch = jest.fn();
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <UserEncounters onBackToSearch={onBackToSearch} onSelectEncounter={onSelectEncounter} userUuid="user-1" />
    </SWRConfig>,
  );
  return { onSelectEncounter, onBackToSearch };
}

function auditRequests() {
  return mockOpenmrsFetch.mock.calls.map(([url]) => url as string).filter((url) => url.includes('/obsaudit?'));
}

function dataRows() {
  return screen.getAllByRole('row').filter((row) => row.querySelectorAll('td').length > 0);
}

describe('<UserEncounters />', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ encountersPageSize: 10 });
    mockRestApi();
  });

  it('asks the pihcore audit endpoint what the user created and what they voided', async () => {
    renderUserEncounters();

    await screen.findByText('Encounters 1–10');
    expect(auditRequests().some((url) => url.includes('createdBy=user-1'))).toBe(true);
    expect(auditRequests().some((url) => url.includes('voidedBy=user-1'))).toBe(true);
  });

  it('shows one page of encounters, most recently changed first', async () => {
    renderUserEncounters();

    await screen.findByText('Encounters 1–10');
    const rows = dataRows();
    expect(rows).toHaveLength(10);
    expect(rows[0]).toHaveTextContent('Patient 0');
    expect(rows[9]).toHaveTextContent('Patient 9');
  });

  /** The point of the exercise: a first page must not read the account's whole trail. */
  it('reads only as far into the trail as the first page needs', async () => {
    // 5000 observations in all, but 20 per encounter means ~220 place the first eleven encounters
    mockRestApi({ totalCreated: 5000, obsPerEncounter: 20 });
    renderUserEncounters();

    await screen.findByText('Encounters 1–10');
    const created = auditRequests().filter((url) => url.includes('createdBy=user-1'));
    expect(created.length).toBeLessThanOrEqual(4);
    expect(startIndexOf(created[created.length - 1])).toBeLessThan(400);
  });

  it('reads further only when the next page is asked for', async () => {
    mockRestApi({ totalCreated: 5000, obsPerEncounter: 20 });
    renderUserEncounters();
    await screen.findByText('Encounters 1–10');
    const beforePaging = auditRequests().length;

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Encounters 11–20')).toBeInTheDocument();
    expect(auditRequests().length).toBeGreaterThan(beforePaging);
    expect(dataRows()[0]).toHaveTextContent('Patient 10');
  });

  it('goes back to a page already read without reading again', async () => {
    mockRestApi({ totalCreated: 5000, obsPerEncounter: 20 });
    renderUserEncounters();
    await screen.findByText('Encounters 1–10');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Encounters 11–20');
    const afterPaging = auditRequests().length;

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Encounters 1–10')).toBeInTheDocument();
    expect(auditRequests()).toHaveLength(afterPaging);
  });

  it('stops offering a next page at the end of the trail', async () => {
    // twelve encounters in all, so the second page is short and there is no third
    mockRestApi({ totalCreated: 12, obsPerEncounter: 1 });
    renderUserEncounters();

    await screen.findByText('Encounters 1–10');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Encounters 11–12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('counts each row’s observations exactly, from the encounter itself', async () => {
    renderUserEncounters();

    await screen.findByText('Encounters 1–10');
    const cells = dataRows()[0].querySelectorAll('td');
    expect(cells[5]).toHaveTextContent('1');
    expect(cells[6]).toHaveTextContent('0');
  });

  /**
   * The framework stubs its range picker as a text input that reports a range once it parses, so
   * the filter can be driven the way a user would. Note that the stub parses with dayjs without the
   * customParseFormat plugin, so despite its DD/MM/YYYY label the value is read as MM/DD/YYYY —
   * hence the American-looking dates below. Real pickers hand the component Date objects.
   */
  const septemberRange = '09/01/2026–09/30/2026';
  it('narrows the search on the server when a date range is picked', async () => {
    renderUserEncounters();
    await screen.findByText('Encounters 1–10');

    await userEvent.clear(screen.getByLabelText('Changed between'));
    await userEvent.type(screen.getByLabelText('Changed between'), septemberRange);

    await waitFor(() =>
      expect(auditRequests().some((url) => url.includes('startDate=2026-09-01&endDate=2026-09-30'))).toBe(true),
    );
    // both halves of "touched" are bounded, not just the one
    const bounded = auditRequests().filter((url) => url.includes('startDate=2026-09-01'));
    expect(bounded.some((url) => url.includes('createdBy=user-1'))).toBe(true);
    expect(bounded.some((url) => url.includes('voidedBy=user-1'))).toBe(true);
  });

  it('starts the trail over when the range changes, rather than mixing two searches', async () => {
    mockRestApi({ totalCreated: 5000, obsPerEncounter: 20 });
    renderUserEncounters();
    await screen.findByText('Encounters 1–10');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Encounters 11–20');

    await userEvent.clear(screen.getByLabelText('Changed between'));
    await userEvent.type(screen.getByLabelText('Changed between'), septemberRange);

    // back to the first page, and reading the bounded trail from its start
    expect(await screen.findByText('Encounters 1–10')).toBeInTheDocument();
    await waitFor(() =>
      expect(auditRequests().some((url) => url.includes('startDate=2026-09-01') && url.includes('startIndex=0'))).toBe(
        true,
      ),
    );
  });

  it('offers to clear the range once one is set, and says when nothing falls in it', async () => {
    renderUserEncounters();
    await screen.findByText('Encounters 1–10');
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

    mockRestApi({ totalCreated: 0, obsPerEncounter: 1 });
    await userEvent.clear(screen.getByLabelText('Changed between'));
    await userEvent.type(screen.getByLabelText('Changed between'), septemberRange);

    expect(await screen.findByText(/did not change any observations matching these filters/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it('offers every encounter type in the system, not just the ones in the trail', async () => {
    renderUserEncounters();
    await screen.findByText('Encounters 1–10');

    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));

    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Consultation', 'Vitals', 'Zibra Admission']);
  });

  it('narrows the list to the chosen encounter type', async () => {
    renderUserEncounters();
    await screen.findByText('Encounters 1–10');
    expect(dataRows()[1]).toHaveTextContent('Patient 1');

    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Consultation' }));

    // the fixture alternates types across thirteen encounters, so seven of them are consultations
    await waitFor(() => expect(screen.getByText('Encounters 1–7')).toBeInTheDocument());
    const patients = dataRows().map((row) => row.querySelectorAll('td')[1].textContent);
    expect(patients).toEqual([
      'Patient 0',
      'Patient 2',
      'Patient 4',
      'Patient 6',
      'Patient 8',
      'Patient 10',
      'Patient 12',
    ]);
  });

  /** Filling a page of one type takes reading past the encounters of every other type. */
  it('reads further to fill a page of a filtered type', async () => {
    mockRestApi({ totalCreated: 5000, obsPerEncounter: 20 });
    renderUserEncounters();
    await screen.findByText('Encounters 1–10');
    const beforeFilter = auditRequests().length;

    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Consultation' }));

    await waitFor(() => expect(dataRows()).toHaveLength(10));
    // a full page of one type needed more of the trail than a full page of any type did
    expect(auditRequests().length).toBeGreaterThan(beforeFilter);
  });

  /**
   * A filter is applied after the trail is read, so rows trickle in. Arming the gate once the first
   * page is up, then filtering, pins the moment a short list is on screen with more still coming.
   */
  it('says more encounters are on the way while it reads further', async () => {
    mockRestApi({ totalCreated: 5000, obsPerEncounter: 20 });
    const respondNormally = mockOpenmrsFetch.getMockImplementation();

    let gateArmed = false;
    let releaseTrail: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseTrail = resolve;
    });
    mockOpenmrsFetch.mockImplementation((url: string, ...rest) => {
      if (gateArmed && url.includes('/obsaudit?')) {
        return gate.then(() => respondNormally(url, ...rest)) as ReturnType<typeof openmrsFetch>;
      }
      return respondNormally(url, ...rest);
    });

    renderUserEncounters();
    await screen.findByText('Encounters 1–10');
    gateArmed = true;

    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Consultation' }));

    // rows are already on screen, and the scan is waiting on the next page of the trail
    expect(await screen.findByText('Looking for more encounters…')).toBeInTheDocument();
    expect(dataRows().length).toBeGreaterThan(0);

    releaseTrail();

    // the range caption only returns once the page's exact counts have been read too
    expect(await screen.findByText('Encounters 1–10')).toBeInTheDocument();
    expect(dataRows()).toHaveLength(10);
    expect(screen.queryByText('Looking for more encounters…')).not.toBeInTheDocument();
  });

  it('says so when nothing in the trail matches the filters', async () => {
    renderUserEncounters();
    await screen.findByText('Encounters 1–10');

    await userEvent.click(screen.getByRole('combobox', { name: /encounter type/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Zibra Admission' }));

    expect(await screen.findByText(/did not change any observations matching these filters/i)).toBeInTheDocument();
  });

  it('drills down into the encounter that is clicked', async () => {
    const { onSelectEncounter } = renderUserEncounters();
    await screen.findByText('Encounters 1–10');

    await userEvent.click(screen.getAllByRole('button', { name: /2026/ })[0]);

    expect(onSelectEncounter).toHaveBeenCalledWith('enc-0');
  });

  it('goes back to the user search', async () => {
    const { onBackToSearch } = renderUserEncounters();

    await userEvent.click(screen.getByRole('button', { name: /back to user search/i }));

    expect(onBackToSearch).toHaveBeenCalled();
  });

  it('says so when the user has changed nothing', async () => {
    mockRestApi({ totalCreated: 0, obsPerEncounter: 1 });
    renderUserEncounters();

    expect(await screen.findByText(/has not recorded or deleted any observations/i)).toBeInTheDocument();
  });
});
