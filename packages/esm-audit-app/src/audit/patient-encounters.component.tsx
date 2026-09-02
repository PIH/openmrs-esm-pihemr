import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { ErrorState, useConfig } from '@openmrs/esm-framework';
import { type Config } from '../config-schema';
import { type AuditEncounter, type AuditPatient } from '../types';
import { formatAuditDatetime } from './audit-format';
import { usePatientEncounters } from './audit.resource';
import { type EncounterFilters, hasActiveFilters } from './encounter-filters';
import styles from './audit.scss';

interface PatientEncountersProps {
  patient: AuditPatient | undefined;
  includeDeleted: boolean;
  filters: EncounterFilters;
  isLoadingPatient: boolean;
  onSelectEncounter(encounterUuid: string): void;
}

function providerNames(encounter: AuditEncounter): string {
  return (encounter.encounterProviders ?? [])
    .filter((encounterProvider) => !encounterProvider.voided)
    .map((encounterProvider) => encounterProvider.provider?.display)
    .filter(Boolean)
    .join(', ');
}

/**
 * Every encounter recorded for the patient, most recent first, as the way into one encounter's
 * audit trail. Deleted encounters are hidden by default, as they were on the legacy admin page.
 */
export default function PatientEncounters({
  patient,
  includeDeleted,
  filters,
  isLoadingPatient,
  onSelectEncounter,
}: PatientEncountersProps) {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.encountersPageSize ?? 10);
  const pageSizes = useMemo(() => Array.from(new Set([pageSize, 10, 20, 50])).sort((a, b) => a - b), [pageSize]);

  const { encounters, totalCount, error, isLoading } = usePatientEncounters(
    patient,
    includeDeleted,
    filters,
    page,
    pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [filters, includeDeleted, patient?.uuid]);

  if (error) {
    return <ErrorState error={error} headerTitle={t('encounters', 'Encounters')} />;
  }

  if (isLoadingPatient || isLoading) {
    return <DataTableSkeleton columnCount={6} compact role="progressbar" showHeader={false} showToolbar={false} />;
  }

  if (encounters.length === 0) {
    return (
      <p className={styles.emptyState}>
        {hasActiveFilters(filters)
          ? t('noEncountersMatchFilters', 'No encounters match these filters.')
          : t('noEncountersFound', 'This patient has no encounters to audit.')}
      </p>
    );
  }

  return (
    <>
      <TableContainer className={styles.tableContainer}>
        <Table size="sm" useZebraStyles>
          <TableHead>
            <TableRow>
              <TableHeader>{t('encounterDate', 'Encounter date')}</TableHeader>
              <TableHeader>{t('encounterType', 'Encounter type')}</TableHeader>
              <TableHeader>{t('form', 'Form')}</TableHeader>
              <TableHeader>{t('provider', 'Provider')}</TableHeader>
              <TableHeader>{t('location', 'Location')}</TableHeader>
              <TableHeader>{t('status', 'Status')}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {encounters.map((encounter) => (
              <TableRow
                className={styles.clickableRow}
                key={encounter.uuid}
                onClick={() => onSelectEncounter(encounter.uuid)}>
                <TableCell>
                  <button
                    className={styles.linkButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectEncounter(encounter.uuid);
                    }}
                    type="button">
                    {formatAuditDatetime(encounter.encounterDatetime)}
                  </button>
                </TableCell>
                <TableCell>{encounter.encounterType?.display}</TableCell>
                <TableCell>{encounter.form?.display}</TableCell>
                <TableCell>{providerNames(encounter)}</TableCell>
                <TableCell>{encounter.location?.display}</TableCell>
                <TableCell>{encounter.voided ? <Tag type="red">{t('deleted', 'Deleted')}</Tag> : null}</TableCell>
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
  );
}
