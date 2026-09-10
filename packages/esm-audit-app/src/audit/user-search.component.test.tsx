import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import UserSearch from './user-search.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

const mockUsers = [
  {
    uuid: 'user-1',
    display: 'butch',
    username: 'butch',
    systemId: '3-4',
    person: { uuid: 'person-1', display: 'Cos John' },
  },
  {
    uuid: 'user-2',
    display: 'retired.clerk',
    username: 'retired.clerk',
    retired: true,
    person: { uuid: 'person-2', display: 'Old Clerk' },
  },
];

function renderUserSearch() {
  const onSelectUser = jest.fn();
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <UserSearch onSelectUser={onSelectUser} />
    </SWRConfig>,
  );
  return onSelectUser;
}

describe('<UserSearch />', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: mockUsers, totalCount: 2 },
    } as unknown as ReturnType<typeof openmrsFetch>);
  });

  it('asks for a search term before searching', () => {
    renderUserSearch();

    expect(screen.getByText(/enter a name or username/i)).toBeInTheDocument();
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('searches users by name or username and lists what it finds', async () => {
    renderUserSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'butch');

    expect(await screen.findByRole('button', { name: 'Cos John' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'butch' })).toBeInTheDocument();
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/ws/rest/v1/user?q=butch'));
  });

  it('marks a retired account, since it can still own an audit trail', async () => {
    renderUserSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'clerk');

    const retiredRow = (await screen.findAllByRole('row')).find((row) => row.textContent?.includes('Old Clerk'));
    expect(retiredRow).toHaveTextContent('Retired');
  });

  it('drills down into the user that is clicked', async () => {
    const onSelectUser = renderUserSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'butch');
    await userEvent.click(await screen.findByRole('button', { name: 'Cos John' }));

    expect(onSelectUser).toHaveBeenCalledWith('user-1');
  });

  it('says so when nothing matches', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [], totalCount: 0 } } as unknown as ReturnType<
      typeof openmrsFetch
    >);
    renderUserSearch();

    await userEvent.type(screen.getByRole('searchbox'), 'nobody');

    expect(await screen.findByText(/no users match "nobody"/i)).toBeInTheDocument();
  });
});
