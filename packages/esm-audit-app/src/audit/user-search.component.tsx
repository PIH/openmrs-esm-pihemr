import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTableSkeleton,
  Pagination,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { ErrorState, useConfig, useDebounce } from '@openmrs/esm-framework';
import { type Config } from '../config-schema';
import { useUserSearch } from './audit.resource';
import styles from './audit.scss';

interface UserSearchProps {
  onSelectUser(userUuid: string): void;
}

/**
 * Finds the user account whose work is being audited, by username or by the person's name.
 */
export default function UserSearch({ onSelectUser }: UserSearchProps) {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.patientSearchPageSize ?? 10);
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 300);
  const pageSizes = useMemo(() => Array.from(new Set([pageSize, 10, 20, 50])).sort((a, b) => a - b), [pageSize]);
  const { users, totalCount, error, isLoading } = useUserSearch(debouncedSearchTerm, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  return (
    <div>
      <Search
        className={styles.searchInput}
        labelText={t('searchForUser', 'Search for a user by name or username')}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder={t('searchForUser', 'Search for a user by name or username')}
        size="lg"
        value={searchTerm}
      />
      {!debouncedSearchTerm ? (
        <p className={styles.emptyState}>
          {t('searchUserToBegin', 'Enter a name or username to see the encounters that user has modified.')}
        </p>
      ) : error ? (
        <ErrorState error={error} headerTitle={t('userSearchResults', 'User search results')} />
      ) : isLoading ? (
        <DataTableSkeleton columnCount={3} compact role="progressbar" showHeader={false} showToolbar={false} />
      ) : users.length === 0 ? (
        <p className={styles.emptyState}>
          {t('noUsersFound', 'No users match "{{searchTerm}}".', { searchTerm: debouncedSearchTerm })}
        </p>
      ) : (
        <>
          <TableContainer className={styles.tableContainer}>
            <Table size="sm" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('name', 'Name')}</TableHeader>
                  <TableHeader>{t('username', 'Username')}</TableHeader>
                  <TableHeader>{t('status', 'Status')}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow className={styles.clickableRow} key={user.uuid} onClick={() => onSelectUser(user.uuid)}>
                    <TableCell>
                      <button
                        className={styles.linkButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectUser(user.uuid);
                        }}
                        type="button">
                        {user.person?.display ?? user.display}
                      </button>
                    </TableCell>
                    <TableCell>{user.username ?? user.systemId}</TableCell>
                    <TableCell>{user.retired ? <Tag type="gray">{t('retired', 'Retired')}</Tag> : null}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            onChange={({ page: nextPage, pageSize: nextPageSize }) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
            page={page}
            pageSize={pageSize}
            pageSizes={pageSizes}
            size="sm"
            totalItems={totalCount}
          />
        </>
      )}
    </div>
  );
}
