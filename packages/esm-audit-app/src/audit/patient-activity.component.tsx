import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DismissibleTag,
  InlineNotification,
  Pagination,
  SkeletonText,
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
import { type AuditPatient } from '../types';
import { formatAuditDatetime } from './audit-format';
import { usePatientActivity } from './audit.resource';
import { type EncounterFilters } from './encounter-filters';
import { type AuditAction, eventUserUuid } from './patient-activity';
import styles from './audit.scss';

interface PatientActivityProps {
  patient: AuditPatient | undefined;
  includeDeleted: boolean;
  filters: EncounterFilters;
  onSelectEncounter(encounterUuid: string): void;
}

const eventsPerPage = 20;

/**
 * Who touched this patient's record: one row per user with what they did, and the individual
 * events behind those counts.
 */
export default function PatientActivity({ patient, includeDeleted, filters, onSelectEncounter }: PatientActivityProps) {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const [selectedUserUuid, setSelectedUserUuid] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { events, userActivity, scannedCount, matchedCount, error, isLoading } = usePatientActivity(
    patient,
    includeDeleted,
    filters,
    config.activityScanLimit ?? 50,
  );

  const selectedUser = useMemo(
    () => userActivity.find((activity) => activity.userUuid === selectedUserUuid),
    [selectedUserUuid, userActivity],
  );

  const shownEvents = useMemo(
    () => (selectedUserUuid ? events.filter((auditEvent) => eventUserUuid(auditEvent) === selectedUserUuid) : events),
    [events, selectedUserUuid],
  );

  useEffect(() => {
    setPage(1);
  }, [selectedUserUuid]);

  /** Clamped rather than reset, so a revalidation that shortens the log cannot blank the page. */
  const totalPages = Math.max(1, Math.ceil(shownEvents.length / eventsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pagedEvents = shownEvents.slice((currentPage - 1) * eventsPerPage, currentPage * eventsPerPage);

  const actionLabels = useMemo<Record<AuditAction, { label: string; type: 'blue' | 'teal' | 'red' | 'gray' }>>(
    () => ({
      encounterCreated: { label: t('encounterCreatedAction', 'Created encounter'), type: 'teal' },
      encounterChanged: { label: t('encounterChangedAction', 'Changed encounter'), type: 'blue' },
      encounterDeleted: { label: t('encounterDeletedAction', 'Deleted encounter'), type: 'red' },
      obsRecorded: { label: t('obsRecordedAction', 'Recorded observation'), type: 'gray' },
      obsEdited: { label: t('obsEditedAction', 'Edited observation'), type: 'blue' },
      obsDeleted: { label: t('obsDeletedAction', 'Deleted observation'), type: 'red' },
    }),
    [t],
  );

  if (error) {
    return <ErrorState error={error} headerTitle={t('recordActivity', 'Record activity')} />;
  }

  if (isLoading) {
    return <SkeletonText heading paragraph role="progressbar" />;
  }

  if (events.length === 0) {
    return <p className={styles.emptyState}>{t('noActivity', 'There is no recorded activity to show.')}</p>;
  }

  return (
    <>
      {matchedCount > scannedCount ? (
        <InlineNotification
          className={styles.inlineNotification}
          hideCloseButton
          kind="info"
          lowContrast
          subtitle={t(
            'activityScanCapped',
            'Showing activity from the {{scannedCount}} most recent of {{matchedCount}} encounters. Narrow by encounter type or date to look further back.',
            { matchedCount, scannedCount },
          )}
          title={t('partialScan', 'Part of the record')}
        />
      ) : null}

      <h3 className={styles.sectionHeading}>{t('whoTouchedThisRecord', 'Who touched this record')}</h3>
      <TableContainer className={styles.tableContainer}>
        <Table size="sm" useZebraStyles>
          <TableHead>
            <TableRow>
              <TableHeader>{t('user', 'User')}</TableHeader>
              <TableHeader>{t('encountersCreated', 'Encounters created')}</TableHeader>
              <TableHeader>{t('obsRecordedCount', 'Observations recorded')}</TableHeader>
              <TableHeader>{t('obsEditedCount', 'Observations edited')}</TableHeader>
              <TableHeader>{t('obsDeletedCount', 'Observations deleted')}</TableHeader>
              <TableHeader>{t('firstActivity', 'First activity')}</TableHeader>
              <TableHeader>{t('lastActivity', 'Last activity')}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {userActivity.map((activity) => {
              const isSelected = activity.userUuid === selectedUserUuid;
              return (
                <TableRow className={isSelected ? styles.selectedRow : undefined} key={activity.userUuid}>
                  <TableCell>
                    <button
                      aria-pressed={isSelected}
                      className={styles.linkButton}
                      onClick={() => setSelectedUserUuid(isSelected ? null : activity.userUuid)}
                      title={t('showOnlyThisUser', "Show only this user's activity")}
                      type="button">
                      {activity.userDisplay || t('unknownUser', 'Unknown user')}
                    </button>
                  </TableCell>
                  <TableCell>{activity.counts.encounterCreated}</TableCell>
                  <TableCell>{activity.counts.obsRecorded}</TableCell>
                  <TableCell>{activity.counts.obsEdited}</TableCell>
                  <TableCell>{activity.counts.obsDeleted}</TableCell>
                  <TableCell>{formatAuditDatetime(activity.firstActivity)}</TableCell>
                  <TableCell>{formatAuditDatetime(activity.lastActivity)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <div className={styles.logHeader}>
        <h3 className={styles.sectionHeading}>{t('activityLog', 'Activity log')}</h3>
        {selectedUserUuid ? (
          <DismissibleTag
            dismissTooltipLabel={t('showEveryone', 'Show everyone')}
            onClose={() => setSelectedUserUuid(null)}
            text={selectedUser?.userDisplay || t('unknownUser', 'Unknown user')}
            title={t('showEveryone', 'Show everyone')}
            type="blue"
          />
        ) : null}
      </div>
      <TableContainer className={styles.tableContainer}>
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>{t('when', 'When')}</TableHeader>
              <TableHeader>{t('user', 'User')}</TableHeader>
              <TableHeader>{t('action', 'Action')}</TableHeader>
              <TableHeader>{t('detail', 'Detail')}</TableHeader>
              <TableHeader>{t('encounter', 'Encounter')}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedEvents.map((auditEvent) => (
              <TableRow key={auditEvent.key}>
                <TableCell>{formatAuditDatetime(auditEvent.timestamp)}</TableCell>
                <TableCell>{auditEvent.user?.display || t('unknownUser', 'Unknown user')}</TableCell>
                <TableCell>
                  <Tag type={actionLabels[auditEvent.action].type}>{actionLabels[auditEvent.action].label}</Tag>
                </TableCell>
                <TableCell>{auditEvent.concept}</TableCell>
                <TableCell>
                  <button
                    className={styles.linkButton}
                    onClick={() => onSelectEncounter(auditEvent.encounter.uuid)}
                    type="button">
                    {[
                      auditEvent.encounter.encounterType?.display,
                      formatAuditDatetime(auditEvent.encounter.encounterDatetime),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Pagination
        onChange={({ page: nextPage }) => setPage(nextPage)}
        page={currentPage}
        pageSize={eventsPerPage}
        pageSizes={[eventsPerPage]}
        size="sm"
        totalItems={shownEvents.length}
      />
    </>
  );
}
