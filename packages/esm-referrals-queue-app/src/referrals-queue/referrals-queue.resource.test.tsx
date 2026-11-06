import { openmrsFetch } from '@openmrs/esm-framework';
import { findNearestVisitLocationUuid, getReferrals } from './referrals-queue.resource';

const mockedOpenmrsFetch = openmrsFetch as jest.Mock;

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  openmrsFetch: jest.fn(),
}));

describe('getReferrals', () => {
  const params = {
    fromDate: '2020-01-01',
    toDate: '2020-02-01',
    locale: 'en',
    locationUuid: 'location-uuid-1',
  };

  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
  });

  it('requests the report with the given dates, locale and location', async () => {
    mockedOpenmrsFetch.mockResolvedValue({ data: { dataSets: [{ rows: [] }] } });

    await getReferrals(params);

    const url = mockedOpenmrsFetch.mock.calls[0][0];
    expect(url).toContain('/reportdata/cd7dfde7-764a-4da6-81c2-d5887ed1df51?');
    expect(url).toContain('startDate=2020-01-01');
    expect(url).toContain('endDate=2020-02-01');
    expect(url).toContain('locale=en');
    expect(url).toContain('location=location-uuid-1');
  });

  it('resolves to the rows of the first data set', async () => {
    const rows = [{ zl_emr_id: 'PTID1' }, { zl_emr_id: 'PTID2' }];
    mockedOpenmrsFetch.mockResolvedValue({ data: { dataSets: [{ rows }] } });

    await expect(getReferrals(params)).resolves.toEqual(rows);
  });

  it('passes the abort signal to the request', async () => {
    mockedOpenmrsFetch.mockResolvedValue({ data: { dataSets: [{ rows: [] }] } });
    const abortController = new AbortController();

    await getReferrals(params, abortController);

    expect(mockedOpenmrsFetch).toHaveBeenCalledWith(expect.any(String), { signal: abortController.signal });
  });

  it('rejects when the request fails', async () => {
    mockedOpenmrsFetch.mockRejectedValue(new Error('network error'));

    await expect(getReferrals(params)).rejects.toThrow('network error');
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
