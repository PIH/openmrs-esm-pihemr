import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTableSkeleton,
  InlineNotification,
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
import { ArrowLeftIcon, ErrorState, useConfig } from '@openmrs/esm-framework';
import { type Config } from '../config-schema';
import { formatAuditDatetime, formatUserAndDate } from './audit-format';
import { useAllEncounterTypes, useAuditProvider, useProviderEncounters } from './audit.resource';
import { type EncounterFilters, hasActiveFilters } from './encounter-filters';
import EncounterFiltersBar from './encounter-filters.component';
import styles from './audit.scss';

interface ProviderEncountersProps {
  providerUuid: string;
  onSelectEncounter(encounterUuid: string): void;
  onBackToSearch(): void;
}

/**
 * The encounters a provider is recorded on, as a way into each one's audit trail.
 *
 * This is "was a provider on", which is not the same as "entered or changed" — the Users tab
 * answers that. The list names who entered each encounter so the distinction stays visible.
 */
export default function ProviderEncounters({
  providerUuid,
  onSelectEncounter,
  onBackToSearch,
}: ProviderEncountersProps) {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const [pageSize, setPageSize] = useState(config.encountersPageSize ?? 10);
  const pageSizes = useMemo(() => Array.from(new Set([pageSize, 10, 20, 50])).sort((a, b) => a - b), [pageSize]);

  const [filters, setFilters] = useState<EncounterFilters>({});

  const { provider, error: providerError, isLoading: isLoadingProvider } = useAuditProvider(providerUuid);
  const { encounterTypes, isLoading: isLoadingTypes } = useAllEncounterTypes();
  const { encounters, totalCount, currentPage, goTo, error, isLoading } = useProviderEncounters(
    providerUuid,
    pageSize,
    filters,
  );

  return (
    <div className={styles.section}>
      <Button className={styles.backButton} kind="ghost" onClick={onBackToSearch} renderIcon={ArrowLeftIcon} size="sm">
        {t('backToProviderSearch', 'Back to provider search')}
      </Button>
      <div className={styles.contextHeader}>
        <span className={styles.contextTitle}>{provider?.person?.display ?? provider?.display ?? ''}</span>
        <span className={styles.contextSubtitle}>{provider?.identifier}</span>
      </div>

      {/*
        Both filters narrow on the server, so the page count and totals stay right — which is why
        the encounter types come from the system-wide list rather than from what is on screen.
      */}
      <EncounterFiltersBar
        encounterTypes={encounterTypes}
        filters={filters}
        isLoadingTypes={isLoadingTypes}
        onChange={setFilters}
      />

      <InlineNotification
        className={styles.inlineNotification}
        hideCloseButton
        kind="info"
        lowContrast
        subtitle={t(
          'providerEncountersScope',
          'These are the encounters this provider is recorded on, which is not the same as the ones they entered or changed — the last column names who did that, and the Users tab searches by it.',
        )}
        title={t('recordedAsProvider', 'Recorded as provider')}
      />

      {providerError || error ? (
        <ErrorState error={providerError ?? error} headerTitle={t('encounters', 'Encounters')} />
      ) : isLoadingProvider || isLoading ? (
        <DataTableSkeleton columnCount={7} compact role="progressbar" showHeader={false} showToolbar={false} />
      ) : encounters.length === 0 ? (
        <p className={styles.emptyState}>
          {hasActiveFilters(filters)
            ? t('noProviderEncountersMatch', 'No encounters for this provider match these filters.')
            : t('noProviderEncounters', 'This provider is not recorded on any encounters.')}
        </p>
      ) : (
        <>
          <TableContainer className={styles.tableContainer}>
            <Table size="sm" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('encounterDate', 'Encounter date')}</TableHeader>
                  <TableHeader>{t('patient', 'Patient')}</TableHeader>
                  <TableHeader>{t('encounterType', 'Encounter type')}</TableHeader>
                  <TableHeader>{t('form', 'Form')}</TableHeader>
                  <TableHeader>{t('location', 'Location')}</TableHeader>
                  <TableHeader>{t('status', 'Status')}</TableHeader>
                  <TableHeader>{t('createdBy', 'Created by')}</TableHeader>
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
                    <TableCell>{encounter.patient?.display}</TableCell>
                    <TableCell>{encounter.encounterType?.display}</TableCell>
                    <TableCell>{encounter.form?.display}</TableCell>
                    <TableCell>{encounter.location?.display}</TableCell>
                    <TableCell>{encounter.voided ? <Tag type="red">{t('deleted', 'Deleted')}</Tag> : null}</TableCell>
                    <TableCell>
                      {formatUserAndDate(encounter.auditInfo?.creator, encounter.auditInfo?.dateCreated)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            onChange={({ page: nextPage, pageSize: nextPageSize }) => {
              setPageSize(nextPageSize);
              goTo(nextPage);
            }}
            page={currentPage}
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
