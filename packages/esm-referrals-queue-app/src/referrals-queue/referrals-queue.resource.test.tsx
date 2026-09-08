import { openmrsFetch, openmrsObservableFetch } from '@openmrs/esm-framework';
import { of } from 'rxjs';
import { findNearestVisitLocationUuid, getReferrals } from './referrals-queue.resource';

const mockedOpenmrsObservableFetch = openmrsObservableFetch as jest.Mock;
const mockedOpenmrsFetch = openmrsFetch as jest.Mock;

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  openmrsObservableFetch: jest.fn(),
  openmrsFetch: jest.fn(),
}));

describe('getReferrals', () => {
  beforeEach(() => {
    mockedOpenmrsObservableFetch.mockReset();
    mockedOpenmrsObservableFetch.mockReturnValue(of({ data: { dataSets: [{ rows: [] }] } }));
  });

  it('includes the given location in the report request', () => {
    getReferrals({
      fromDate: '2020-01-01',
      toDate: '2020-02-01',
      locale: 'en',
      locationUuid: 'location-uuid-1',
    }).subscribe();

    expect(mockedOpenmrsObservableFetch).toHaveBeenCalledWith(expect.stringContaining('location=location-uuid-1'));
  });
});

describe('findNearestVisitLocationUuid', () => {
  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
  });

  function mockLocationChain(chain: Record<string, string | undefined>) {
    mockedOpenmrsFetch.mockImplementation((url: string) => {
      const uuid = url.match(/\/location\/([^?]+)/)[1];
      const parentUuid = chain[uuid];
      return Promise.resolve({ data: { uuid, parentLocation: parentUuid ? { uuid: parentUuid } : undefined } });
    });
  }

  it('resolves immediately without a network call when the starting location is already a candidate', async () => {
    const result = await findNearestVisitLocationUuid('loc-a', new Set(['loc-a']));

    expect(result).toBe('loc-a');
    expect(mockedOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('walks up one level to find a match', async () => {
    mockLocationChain({ 'loc-room': 'loc-facility' });

    const result = await findNearestVisitLocationUuid('loc-room', new Set(['loc-facility']));

    expect(result).toBe('loc-facility');
    expect(mockedOpenmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('/location/loc-room?v=custom:(uuid,parentLocation:ref)'),
    );
  });

  it('stops at the nearest match without walking past it', async () => {
    mockLocationChain({
      'loc-room': 'loc-department',
      'loc-department': 'loc-facility',
      'loc-facility': 'loc-country',
    });

    const result = await findNearestVisitLocationUuid('loc-room', new Set(['loc-facility', 'loc-country']));

    expect(result).toBe('loc-facility');
    expect(mockedOpenmrsFetch).toHaveBeenCalledTimes(2);
  });

  it('resolves undefined when no ancestor matches', async () => {
    mockLocationChain({ 'loc-room': 'loc-facility' });

    const result = await findNearestVisitLocationUuid('loc-room', new Set(['some-other-location']));

    expect(result).toBeUndefined();
  });

  it('resolves undefined and does not hang on a cyclic hierarchy', async () => {
    mockLocationChain({ 'loc-a': 'loc-b', 'loc-b': 'loc-a' });

    const result = await findNearestVisitLocationUuid('loc-a', new Set(['some-other-location']));

    expect(result).toBeUndefined();
    expect(mockedOpenmrsFetch).toHaveBeenCalledTimes(2);
  });

  it('resolves undefined rather than throwing when a fetch fails', async () => {
    mockedOpenmrsFetch.mockRejectedValueOnce(new Error('network error'));

    await expect(findNearestVisitLocationUuid('loc-room', new Set(['loc-facility']))).resolves.toBeUndefined();
  });
});
