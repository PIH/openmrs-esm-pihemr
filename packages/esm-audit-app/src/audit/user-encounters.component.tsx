import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ComboBox,
  DataTableSkeleton,
  InlineLoading,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { ArrowLeftIcon, ErrorState, OpenmrsDateRangePicker, useConfig } from '@openmrs/esm-framework';
import { type Config } from '../config-schema';
import { type OpenmrsResourceRef } from '../types';
import { formatAuditDatetime } from './audit-format';
import { type DateRange, fromDateKey, hasDateRange, toDateKey } from './date-range';
import { useAllEncounterTypes, useAuditUser, useUserEncounters } from './audit.resource';
import styles from './audit.scss';

interface UserEncountersProps {
  userUuid: string;
  onSelectEncounter(encounterUuid: string): void;
  onBackToSearch(): void;
}

/**
 * The encounters whose observations a user recorded or deleted, as a way into each one's audit
 * trail. Unlike the provider list, this really is "what did this account change" — it is built from
 * the pihcore audit endpoint, which searches observations by their creator and voiding user.
 */
export default function UserEncounters({ userUuid, onSelectEncounter, onBackToSearch }: UserEncountersProps) {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const pageSize = config.encountersPageSize ?? 10;
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [encounterType, setEncounterType] = useState<OpenmrsResourceRef | null>(null);
  const today = new Date();

  const { user, error: userError, isLoading: isLoadingUser } = useAuditUser(userUuid);
  const { encounterTypes, isLoading: isLoadingTypes } = useAllEncounterTypes();
  const {
    activity,
    currentPage,
    goTo,
    firstRowOnPage,
    hasNextPage,
    obsRead,
    stoppedEarly,
    isDiscovering,
    error,
    isLoading,
  } = useUserEncounters(userUuid, pageSize, dateRange, encounterType?.uuid);

  const hasFilters = hasDateRange(dateRange) || Boolean(encounterType);

  return (
    <div className={styles.section}>
      <Button className={styles.backButton} kind="ghost" onClick={onBackToSearch} renderIcon={ArrowLeftIcon} size="sm">
        {t('backToUserSearch', 'Back to user search')}
      </Button>
      <div className={styles.contextHeader}>
        <span className={styles.contextTitle}>{user?.person?.display ?? user?.display ?? ''}</span>
        <span className={styles.contextSubtitle}>{user?.username ?? user?.systemId}</span>
      </div>

      {/*
        The range narrows the trail on the server: the audit endpoint bounds each search against
        its own audit column, so this asks when the account made a change, not when the observation
        it changed was taken.
      */}
      <div className={styles.filters}>
        {/*
          Every type in the system rather than only those this account has touched: encounters are
          discovered lazily, so which types the trail holds is not known until all of it is read.
        */}
        <ComboBox
          className={styles.filterControl}
          disabled={isLoadingTypes}
          id="user-encounter-type-filter"
          items={encounterTypes}
          itemToString={(type: OpenmrsResourceRef | null) => type?.display ?? ''}
          onChange={({ selectedItem }: { selectedItem: OpenmrsResourceRef | null }) =>
            setEncounterType(selectedItem ?? null)
          }
          placeholder={t('allEncounterTypes', 'All encounter types')}
          selectedItem={encounterType}
          size="sm"
          titleText={t('encounterType', 'Encounter type')}
        />
        <OpenmrsDateRangePicker
          className={styles.filterControl}
          id="user-activity-date-range"
          labelText={t('changedBetween', 'Changed between')}
          maxDate={today}
          onChange={([from, to]) => setDateRange({ fromDate: toDateKey(from), toDate: toDateKey(to) })}
          size="sm"
          value={[fromDateKey(dateRange.fromDate), fromDateKey(dateRange.toDate)]}
        />
        {hasFilters ? (
          <Button
            className={styles.clearFilters}
            kind="ghost"
            onClick={() => {
              setDateRange({});
              setEncounterType(null);
            }}
            size="sm">
            {t('clearFilters', 'Clear filters')}
          </Button>
        ) : null}
      </div>

      {userError || error ? (
        <ErrorState error={userError ?? error} headerTitle={t('encounters', 'Encounters')} />
      ) : isLoadingUser || isLoading ? (
        <>
          {obsRead > 0 ? (
            <InlineLoading
              description={t('readingUserObservations', 'Read {{obsRead}} observations so far…', { obsRead })}
            />
          ) : null}
          <DataTableSkeleton columnCount={7} compact role="progressbar" showHeader={false} showToolbar={false} />
        </>
      ) : activity.length === 0 ? (
        <p className={styles.emptyState}>
          {hasFilters
            ? t('noUserEncountersMatch', 'This user did not change any observations matching these filters.')
            : t('noUserEncounters', 'This user has not recorded or deleted any observations.')}
        </p>
      ) : (
        <>
          {stoppedEarly ? (
            <InlineNotification
              className={styles.inlineNotification}
              hideCloseButton
              kind="info"
              lowContrast
              subtitle={t(
                'userScanStoppedEarly',
                'Stopped after reading {{obsRead}} observation changes without filling the page. Narrow the date range to search further back.',
                { obsRead },
              )}
              title={t('partialUserScan', 'Part of the trail')}
            />
          ) : null}
          <TableContainer className={styles.tableContainer}>
            <Table size="sm" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('lastChanged', 'Last changed')}</TableHeader>
                  <TableHeader>{t('patient', 'Patient')}</TableHeader>
                  <TableHeader>{t('encounterType', 'Encounter type')}</TableHeader>
                  <TableHeader>{t('encounterDate', 'Encounter date')}</TableHeader>
                  <TableHeader>{t('location', 'Location')}</TableHeader>
                  <TableHeader>{t('obsRecordedCount', 'Observations recorded')}</TableHeader>
                  <TableHeader>{t('obsDeletedCount', 'Observations deleted')}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {activity.map(({ encounter, obsCreated, obsVoided, lastActivity }) => (
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
                        {formatAuditDatetime(lastActivity)}
                      </button>
                    </TableCell>
                    <TableCell>{encounter.patient?.display}</TableCell>
                    <TableCell>
                      {encounter.encounterType?.display}
                      {encounter.voided ? <Tag type="red">{t('deleted', 'Deleted')}</Tag> : null}
                    </TableCell>
                    <TableCell>{formatAuditDatetime(encounter.encounterDatetime)}</TableCell>
                    <TableCell>{encounter.location?.display}</TableCell>
                    <TableCell>{obsCreated}</TableCell>
                    <TableCell>{obsVoided}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/*
            How many encounters this account has touched cannot be known without reading its whole
            trail, which is the very thing being avoided, so there is no total to page against.
            A range and a next button say exactly what is known.
          */}
          <div className={styles.lazyPagination}>
            <span className={styles.paginationRange}>
              {t('encounterRange', 'Encounters {{from}}–{{to}}', {
                from: firstRowOnPage + 1,
                to: firstRowOnPage + activity.length,
              })}
            </span>
            {/*
              A filter is applied after the trail has been read, so matching rows arrive as the
              scan goes on. Without this the list looks finished while it is still filling.
            */}
            {isDiscovering ? (
              <InlineLoading
                className={styles.discovering}
                description={t('lookingForMoreEncounters', 'Looking for more encounters…')}
              />
            ) : null}
            <Button disabled={currentPage === 1} kind="ghost" onClick={() => goTo(currentPage - 1)} size="sm">
              {t('previousPage', 'Previous')}
            </Button>
            <Button disabled={!hasNextPage} kind="ghost" onClick={() => goTo(currentPage + 1)} size="sm">
              {t('nextPage', 'Next')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
