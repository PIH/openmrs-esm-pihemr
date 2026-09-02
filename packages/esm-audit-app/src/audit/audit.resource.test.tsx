import React, { type PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import { type AuditEncounter, type AuditPatient } from '../types';
import { usePatientEncounters, usePatientEncounterTypes } from './audit.resource';
import { type EncounterFilters } from './encounter-filters';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

const patient: AuditPatient = {
  uuid: 'patient-1',
  display: 'Y2AHXV - Dave TestPatient',
  identifiers: [{ uuid: 'id-1', identifier: 'Y2AHXV', preferred: true }],
};

const consultationType = { uuid: 'type-consultation', display: 'Oncology Consultation' };
const checkinType = { uuid: 'type-checkin', display: 'Inscription' };

const april: AuditEncounter = {
  uuid: 'enc-april',
  encounterDatetime: '2026-04-18T09:00:00.000+0000',
  patient: { uuid: 'patient-1', display: 'Dave TestPatient' },
  encounterType: consultationType,
};

const may: AuditEncounter = {
  uuid: 'enc-may',
  encounterDatetime: '2026-05-02T09:00:00.000+0000',
  voided: true,
  patient: { uuid: 'patient-1', display: 'Dave TestPatient' },
  encounterType: checkinType,
};

const wrapper = ({ children }: PropsWithChildren) => (
  <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>{children}</SWRConfig>
);

function renderUsePatientEncounters(includeDeleted: boolean, filters: EncounterFilters) {
  return renderHook(() => usePatientEncounters(patient, includeDeleted, filters, 1, 10), { wrapper });
}

describe('usePatientEncounters', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/encounter?q=')) {
        return Promise.resolve({ data: { results: [april, may] } }) as ReturnType<typeof openmrsFetch>;
      }
      return Promise.resolve({ data: { results: [april], totalCount: 1 } }) as ReturnType<typeof openmrsFetch>;
    });
  });

  it('reuses one read of the deleted-encounter search across both hooks', async () => {
    const { result } = renderHook(
      () => ({
        encounters: usePatientEncounters(patient, true, {}, 1, 10),
        types: usePatientEncounterTypes(patient, true),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.types.encounterTypes).toHaveLength(2));
    expect(result.current.encounters.encounters).toHaveLength(2);
    expect(mockOpenmrsFetch.mock.calls.filter(([url]) => (url as string).includes('/encounter?q=')).length).toBe(1);
  });

  it('has the server apply the filters when deleted encounters are excluded', async () => {
    const { result } = renderUsePatientEncounters(false, {
      encounterType: consultationType,
      fromDate: '2026-04-01',
      toDate: '2026-04-30',
    });

    await waitFor(() => expect(result.current.encounters).toHaveLength(1));
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '&encounterType=type-consultation&fromdate=2026-04-01T00:00:00&todate=2026-04-30T23:59:59',
      ),
    );
  });

  it('applies the filters on the client when deleted encounters are included', async () => {
    const { result } = renderUsePatientEncounters(true, { fromDate: '2026-05-01' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.encounters.map((encounter) => encounter.uuid)).toEqual(['enc-may']);
    expect(result.current.totalCount).toBe(1);
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/encounter?q=Y2AHXV&includeAll=true'));
  });

  it('returns both encounters when nothing is filtered', async () => {
    const { result } = renderUsePatientEncounters(true, {});

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.encounters.map((encounter) => encounter.uuid)).toEqual(['enc-may', 'enc-april']);
  });

  it('cannot list deleted encounters for a patient with no identifier', async () => {
    const { result } = renderHook(
      () => usePatientEncounters({ uuid: 'patient-2', display: 'No Identifier' }, true, {}, 1, 10),
      { wrapper },
    );

    await waitFor(() => expect(result.current.cannotIncludeDeleted).toBe(true));
    expect(result.current.encounters).toEqual([]);
  });
});

describe('usePatientEncounterTypes', () => {
  it("offers only the types the patient's own encounters use", async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('totalCount=true')) {
        return Promise.resolve({ data: { results: [], totalCount: 0 } }) as ReturnType<typeof openmrsFetch>;
      }
      return Promise.resolve({ data: { results: [april, { ...april, uuid: 'enc-again' }] } }) as ReturnType<
        typeof openmrsFetch
      >;
    });

    const { result } = renderHook(() => usePatientEncounterTypes(patient, false), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.encounterTypes).toEqual([consultationType]);
  });

  it('includes types that only deleted encounters use, once those are shown', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/encounter?q=')) {
        return Promise.resolve({ data: { results: [april, may] } }) as ReturnType<typeof openmrsFetch>;
      }
      return Promise.resolve({ data: { results: [april] } }) as ReturnType<typeof openmrsFetch>;
    });

    const { result } = renderHook(() => usePatientEncounterTypes(patient, true), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.encounterTypes).toEqual([checkinType, consultationType]);
  });

  it("leaves out other patients' types when reading the deleted-encounter search", async () => {
    mockOpenmrsFetch.mockImplementation(
      () =>
        Promise.resolve({
          data: {
            results: [april, { ...may, patient: { uuid: 'patient-2', display: 'Someone Else' } }],
          },
        }) as ReturnType<typeof openmrsFetch>,
    );

    const { result } = renderHook(() => usePatientEncounterTypes(patient, true), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.encounterTypes).toEqual([consultationType]);
  });
});
