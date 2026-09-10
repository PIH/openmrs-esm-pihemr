import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import ProviderSearch from './provider-search.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

const mockProviders = [
  {
    uuid: 'prov-1',
    display: 'MCPRPG - Louidor Jean paul',
    identifier: 'MCPRPG',
    person: { uuid: 'person-1', display: 'Louidor Jean paul', gender: 'M' },
  },
];

function renderProviderSearch() {
  const onSelectProvider = jest.fn();
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <ProviderSearch onSelectProvider={onSelectProvider} />
    </SWRConfig>,
  );
  return onSelectProvider;
}

describe('<ProviderSearch />', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: mockProviders, totalCount: 1 },
    } as unknown as ReturnType<typeof openmrsFetch>);
  });

  it('asks for a search term before searching', () => {
    renderProviderSearch();

    expect(screen.getByText(/enter a provider name or identifier/i)).toBeInTheDocument();
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('searches providers by name or identifier and lists what it finds', async () => {
    renderProviderSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'MCPRPG');

    expect(await screen.findByRole('button', { name: 'Louidor Jean paul' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'MCPRPG' })).toBeInTheDocument();
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/ws/rest/v1/provider?q=MCPRPG'));
  });

  it('drills down into the provider that is clicked', async () => {
    const onSelectProvider = renderProviderSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'MCPRPG');
    await userEvent.click(await screen.findByRole('button', { name: 'Louidor Jean paul' }));

    expect(onSelectProvider).toHaveBeenCalledWith('prov-1');
  });

  it('says so when nothing matches', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [], totalCount: 0 } } as unknown as ReturnType<
      typeof openmrsFetch
    >);
    renderProviderSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'nobody');

    expect(await screen.findByText(/no providers match "nobody"/i)).toBeInTheDocument();
  });
});
