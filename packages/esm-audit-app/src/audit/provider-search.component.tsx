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
} from '@carbon/react';
import { ErrorState, useConfig, useDebounce } from '@openmrs/esm-framework';
import { type Config } from '../config-schema';
import { useProviderSearch } from './audit.resource';
import styles from './audit.scss';

interface ProviderSearchProps {
  onSelectProvider(providerUuid: string): void;
}

/**
 * Finds the provider whose encounters are being audited, by name or by provider identifier.
 */
export default function ProviderSearch({ onSelectProvider }: ProviderSearchProps) {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.patientSearchPageSize ?? 10);
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 300);
  const pageSizes = useMemo(() => Array.from(new Set([pageSize, 10, 20, 50])).sort((a, b) => a - b), [pageSize]);
  const { providers, totalCount, error, isLoading } = useProviderSearch(debouncedSearchTerm, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  return (
    <div>
      <Search
        className={styles.searchInput}
        labelText={t('searchForProvider', 'Search for a provider by name or identifier')}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder={t('searchForProvider', 'Search for a provider by name or identifier')}
        size="lg"
        value={searchTerm}
      />
      {!debouncedSearchTerm ? (
        <p className={styles.emptyState}>
          {t(
            'searchProviderToBegin',
            'Enter a provider name or identifier to see the encounters they are recorded on.',
          )}
        </p>
      ) : error ? (
        <ErrorState error={error} headerTitle={t('providerSearchResults', 'Provider search results')} />
      ) : isLoading ? (
        <DataTableSkeleton columnCount={3} compact role="progressbar" showHeader={false} showToolbar={false} />
      ) : providers.length === 0 ? (
        <p className={styles.emptyState}>
          {t('noProvidersFound', 'No providers match "{{searchTerm}}".', { searchTerm: debouncedSearchTerm })}
        </p>
      ) : (
        <>
          <TableContainer className={styles.tableContainer}>
            <Table size="sm" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('providerName', 'Provider name')}</TableHeader>
                  <TableHeader>{t('identifier', 'Identifier')}</TableHeader>
                  <TableHeader>{t('gender', 'Gender')}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow
                    className={styles.clickableRow}
                    key={provider.uuid}
                    onClick={() => onSelectProvider(provider.uuid)}>
                    <TableCell>
                      <button
                        className={styles.linkButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectProvider(provider.uuid);
                        }}
                        type="button">
                        {provider.person?.display ?? provider.display}
                      </button>
                    </TableCell>
                    <TableCell>{provider.identifier}</TableCell>
                    <TableCell>{provider.person?.gender}</TableCell>
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
