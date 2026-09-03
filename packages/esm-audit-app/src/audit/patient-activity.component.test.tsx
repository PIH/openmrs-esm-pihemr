import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { type AuditEncounter, type AuditObs, type AuditPatient } from '../types';
import PatientActivity from './patient-activity.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseConfig = jest.mocked(useConfig);

const clerk = { uuid: 'user-clerk', display: 'Cos John' };
const nurse = { uuid: 'user-nurse', display: 'Louidor Jean paul' };
const created = '2026-09-01T11:09:00.000+0000';
const dayAfter = '2026-09-02T08:30:00.000+0000';

const patient: AuditPatient = {
  uuid: 'patient-1',
  display: 'Y2AHXV - Dave TestPatient',
  identifiers: [{ uuid: 'id-1', identifier: 'Y2AHXV', preferred: true }],
};

const encounters: Array<AuditEncounter> = [
  {
    uuid: 'enc-1',
    encounterDatetime: created,
    encounterType: { uuid: 'type-1', display: 'COVID-19 Admission' },
    auditInfo: { creator: clerk, dateCreated: created },
  },
];

const obs: Array<AuditObs> = [
  {
    uuid: 'obs-pulse-new',
    concept: { uuid: 'concept-pulse', display: 'Pulse' },
    previousVersion: { uuid: 'obs-pulse-old' },
    auditInfo: { creator: nurse, dateCreated: dayAfter },
  },
  {
    uuid: 'obs-pulse-old',
    concept: { uuid: 'concept-pulse', display: 'Pulse' },
    voided: true,
    auditInfo: { creator: clerk, dateCreated: created, voidedBy: nurse, dateVoided: dayAfter },
  },
];

function mockRestApi({ encounterList = encounters }: { encounterList?: Array<AuditEncounter> } = {}) {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    if (url.includes('/obs?encounter=')) {
      return Promise.resolve({ data: { results: obs } }) as ReturnType<typeof openmrsFetch>;
    }
    return Promise.resolve({ data: { results: encounterList } }) as ReturnType<typeof openmrsFetch>;
  });
}

function renderPatientActivity() {
  const onSelectEncounter = jest.fn();
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <PatientActivity filters={{}} includeDeleted={false} onSelectEncounter={onSelectEncounter} patient={patient} />
    </SWRConfig>,
  );
  return onSelectEncounter;
}

function rowFor(name: string) {
  return screen.getAllByRole('row').find((row) => row.textContent?.includes(name));
}

/** The activity log's rows, which are the ones naming an action. */
function logRows() {
  return screen
    .getAllByRole('row')
    .filter((row) =>
      /Created encounter|Edited observation|Recorded observation|Deleted observation/.test(row.textContent ?? ''),
    );
}

describe('<PatientActivity />', () => {
  beforeEach(() => {
    mockRestApi();
  });

  it('says who touched the record and what each of them did', async () => {
    renderPatientActivity();

    expect(await screen.findByText('Who modified this patient record')).toBeInTheDocument();

    const clerkRow = rowFor('Cos John');
    expect(within(clerkRow).getAllByRole('cell')[1]).toHaveTextContent('1');
    expect(within(clerkRow).getAllByRole('cell')[2]).toHaveTextContent('1');

    const nurseRow = rowFor('Louidor Jean paul');
    expect(within(nurseRow).getAllByRole('cell')[3]).toHaveTextContent('1');
  });

  it('lists the individual events, most recent first', async () => {
    renderPatientActivity();
    await screen.findByText('Activity log');

    const rows = logRows();
    expect(rows[0]).toHaveTextContent('Edited observation');
    expect(rows[0]).toHaveTextContent('Louidor Jean paul');
    expect(rows[0]).toHaveTextContent('Pulse');
    expect(rows[0]).toHaveTextContent('COVID-19 Admission');
  });

  it('narrows the activity log to one user, and back again', async () => {
    renderPatientActivity();
    await screen.findByText('Activity log');
    expect(logRows()).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: 'Louidor Jean paul' }));

    const nurseOnly = logRows();
    expect(nurseOnly).toHaveLength(1);
    expect(nurseOnly[0]).toHaveTextContent('Edited observation');
    expect(screen.getByRole('button', { name: 'Louidor Jean paul' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: /show everyone/i }));

    expect(logRows()).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Louidor Jean paul' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking the selected user again shows everyone', async () => {
    renderPatientActivity();
    await screen.findByText('Activity log');

    await userEvent.click(screen.getByRole('button', { name: 'Cos John' }));
    expect(logRows()).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Cos John' }));
    expect(logRows()).toHaveLength(3);
  });

  it('drills into the encounter behind an event', async () => {
    const onSelectEncounter = renderPatientActivity();
    await screen.findByText('Activity log');

    await userEvent.click(screen.getAllByRole('button', { name: /COVID-19 Admission/ })[0]);

    expect(onSelectEncounter).toHaveBeenCalledWith('enc-1');
  });

  it("reads every encounter's observations, however many there are", async () => {
    mockRestApi({
      encounterList: [
        encounters[0],
        { ...encounters[0], uuid: 'enc-2', auditInfo: { creator: clerk, dateCreated: created } },
      ],
    });
    renderPatientActivity();

    await screen.findByText('Activity log');

    // Both encounters are created by the clerk and both contribute their observations.
    const clerkRow = rowFor('Cos John');
    expect(within(clerkRow).getAllByRole('cell')[1]).toHaveTextContent('2');
    expect(within(clerkRow).getAllByRole('cell')[2]).toHaveTextContent('2');
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/obs?encounter=enc-1'));
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/obs?encounter=enc-2'));
  });

  it('says how far the observation reads have got while they run', async () => {
    let releaseObs: (value: unknown) => void = () => {};
    const obsGate = new Promise((resolve) => {
      releaseObs = resolve;
    });
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/obs?encounter=')) {
        return obsGate.then(() => ({ data: { results: obs } })) as ReturnType<typeof openmrsFetch>;
      }
      return Promise.resolve({ data: { results: encounters } }) as ReturnType<typeof openmrsFetch>;
    });
    renderPatientActivity();

    expect(await screen.findByText(/reading observations from 0 of 1 encounters/i)).toBeInTheDocument();

    releaseObs(null);

    expect(await screen.findByText('Activity log')).toBeInTheDocument();
  });

  it('says when there is nothing to show', async () => {
    mockRestApi({ encounterList: [] });
    renderPatientActivity();

    expect(await screen.findByText(/no recorded activity/i)).toBeInTheDocument();
  });
});
