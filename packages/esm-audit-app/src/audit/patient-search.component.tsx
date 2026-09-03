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
import { formatAuditDate } from './audit-format';
import { getPreferredIdentifier, usePatientSearch } from './audit.resource';
import styles from './audit.scss';

interface PatientSearchProps {
  onSelectPatient(patientUuid: string): void;
}

/**
 * Step one of the audit trail: find the patient whose records are being audited, by name or by
 * identifier. This mirrors the legacy admin page, which searched encounters by patient name or
 * identifier, except that the patient is chosen explicitly before their encounters are listed.
 */
export default function PatientSearch({ onSelectPatient }: PatientSearchProps) {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.patientSearchPageSize ?? 10);
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 300);
  const pageSizes = useMemo(() => Array.from(new Set([pageSize, 10, 20, 50])).sort((a, b) => a - b), [pageSize]);
  const { patients, totalCount, error, isLoading } = usePatientSearch(debouncedSearchTerm, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  return (
    <div className={styles.section}>
      <Search
        className={styles.searchInput}
        labelText={t('searchForPatient', 'Search for a patient by name or identifier')}
        placeholder={t('searchForPatient', 'Search for a patient by name or identifier')}
        onChange={(event) => setSearchTerm(event.target.value)}
        size="lg"
        value={searchTerm}
      />
      {!debouncedSearchTerm ? (
        <p className={styles.emptyState}>
          {t('searchToBegin', 'Enter a patient name or identifier to begin auditing their records.')}
        </p>
      ) : error ? (
        <ErrorState error={error} headerTitle={t('patientSearchResults', 'Patient search results')} />
      ) : isLoading ? (
        <DataTableSkeleton columnCount={5} compact role="progressbar" showHeader={false} showToolbar={false} />
      ) : patients.length === 0 ? (
        <p className={styles.emptyState}>
          {t('noPatientsFound', 'No patients match "{{searchTerm}}".', { searchTerm: debouncedSearchTerm })}
        </p>
      ) : (
        <>
          <TableContainer className={styles.tableContainer}>
            <Table size="sm" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('patientName', 'Patient name')}</TableHeader>
                  <TableHeader>{t('identifier', 'Identifier')}</TableHeader>
                  <TableHeader>{t('gender', 'Gender')}</TableHeader>
                  <TableHeader>{t('age', 'Age')}</TableHeader>
                  <TableHeader>{t('birthdate', 'Date of birth')}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow
                    className={styles.clickableRow}
                    key={patient.uuid}
                    onClick={() => onSelectPatient(patient.uuid)}>
                    <TableCell>
                      <button
                        className={styles.linkButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectPatient(patient.uuid);
                        }}
                        type="button">
                        {patient.person?.display ?? patient.display}
                      </button>
                    </TableCell>
                    <TableCell>{getPreferredIdentifier(patient)}</TableCell>
                    <TableCell>{patient.person?.gender}</TableCell>
                    <TableCell>{patient.person?.age}</TableCell>
                    <TableCell>{formatAuditDate(patient.person?.birthdate)}</TableCell>
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
