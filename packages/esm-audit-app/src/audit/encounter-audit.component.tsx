import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  InlineNotification,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  SkeletonText,
  Tag,
} from '@carbon/react';
import { ArrowLeftIcon, ConfigurableLink, ErrorState, useConfig } from '@openmrs/esm-framework';
import { type Config } from '../config-schema';
import { type AuditEncounter } from '../types';
import { formatAuditDatetime, formatUserAndDate } from './audit-format';
import { getPreferredIdentifier, useEncounterAudit } from './audit.resource';
import ObsAuditTable from './obs-audit-table.component';
import styles from './audit.scss';

interface EncounterAuditProps {
  encounterUuid: string;
  /** Called with the encounter's patient, so that a deep link can navigate back up the trail. */
  onBackToEncounters(patientUuid: string | undefined): void;
}

interface SummaryRow {
  label: string;
  value: React.ReactNode;
}

/**
 * Step three of the audit trail: everything known about how one encounter came to be — who created
 * it, who last changed it, whether it has been deleted, and the full history of its observations.
 */
export default function EncounterAudit({ encounterUuid, onBackToEncounters }: EncounterAuditProps) {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const { encounter, obsTree, error, isLoading } = useEncounterAudit(encounterUuid);

  if (error) {
    return (
      <div className={styles.section}>
        <BackButton onClick={() => onBackToEncounters(undefined)} />
        <ErrorState error={error} headerTitle={t('encounterAudit', 'Encounter audit')} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.section}>
        <BackButton onClick={() => onBackToEncounters(undefined)} />
        <SkeletonText heading paragraph role="progressbar" />
      </div>
    );
  }

  if (!encounter) {
    return (
      <div className={styles.section}>
        <BackButton onClick={() => onBackToEncounters(undefined)} />
        <p className={styles.emptyState}>{t('encounterNotFound', 'That encounter could not be found.')}</p>
      </div>
    );
  }

  const patientUuid = encounter.patient?.uuid;
  const summaryRows: Array<SummaryRow> = [
    {
      label: t('patient', 'Patient'),
      value: patientUuid ? (
        <ConfigurableLink to={config.patientChartUrl} templateParams={{ patientUuid }}>
          {encounter.patient?.display}
        </ConfigurableLink>
      ) : (
        encounter.patient?.display
      ),
    },
    { label: t('identifier', 'Identifier'), value: getPreferredIdentifier(encounter.patient) },
    { label: t('encounterDate', 'Encounter date'), value: formatAuditDatetime(encounter.encounterDatetime) },
    { label: t('location', 'Location'), value: encounter.location?.display },
    { label: t('visit', 'Visit'), value: encounter.visit?.display },
    { label: t('encounterType', 'Encounter type'), value: encounter.encounterType?.display },
    { label: t('form', 'Form'), value: formatForm(encounter) },
    {
      label: t('createdBy', 'Created by'),
      value: formatUserAndDate(encounter.auditInfo?.creator, encounter.auditInfo?.dateCreated),
    },
  ];

  if (encounter.auditInfo?.changedBy) {
    summaryRows.push({
      label: t('changedBy', 'Changed by'),
      value: formatUserAndDate(encounter.auditInfo.changedBy, encounter.auditInfo.dateChanged),
    });
  }

  if (encounter.voided) {
    summaryRows.push({
      label: t('deletedBy', 'Deleted by'),
      value: formatUserAndDate(encounter.auditInfo?.voidedBy, encounter.auditInfo?.dateVoided),
    });
    if (encounter.auditInfo?.voidReason) {
      summaryRows.push({ label: t('deletionReason', 'Reason for deletion'), value: encounter.auditInfo.voidReason });
    }
  }

  const providers = (encounter.encounterProviders ?? []).filter((encounterProvider) => !encounterProvider.voided);

  return (
    <div className={styles.section}>
      <BackButton onClick={() => onBackToEncounters(patientUuid)} />
      <div className={styles.contextHeader}>
        <span className={styles.contextTitle}>
          {encounter.encounterType?.display ?? t('encounter', 'Encounter')}
          {encounter.voided ? <Tag type="red">{t('deleted', 'Deleted')}</Tag> : null}
        </span>
        <span className={styles.contextSubtitle}>
          {[encounter.patient?.display, formatAuditDatetime(encounter.encounterDatetime)].filter(Boolean).join(' · ')}
        </span>
      </div>

      {encounter.voided ? (
        <InlineNotification
          className={styles.inlineNotification}
          hideCloseButton
          kind="warning"
          lowContrast
          subtitle={t(
            'encounterDeletedSubtitle',
            'This encounter has been deleted. Its observations are shown as they were left.',
          )}
          title={t('encounterDeleted', 'Deleted encounter')}
        />
      ) : null}

      <h3 className={styles.sectionHeading}>{t('encounterSummary', 'Encounter summary')}</h3>
      <StructuredListWrapper className={styles.summaryList} isCondensed>
        <StructuredListBody>
          {summaryRows.map((row) => (
            <StructuredListRow key={row.label}>
              <StructuredListCell className={styles.summaryLabel} noWrap>
                {row.label}
              </StructuredListCell>
              <StructuredListCell className={styles.summaryValue}>{row.value}</StructuredListCell>
            </StructuredListRow>
          ))}
        </StructuredListBody>
      </StructuredListWrapper>

      <h3 className={styles.sectionHeading}>{t('providers', 'Providers')}</h3>
      {providers.length === 0 ? (
        <p className={styles.emptyState}>{t('noProviders', 'No providers are recorded for this encounter.')}</p>
      ) : (
        <TableContainer className={styles.tableContainer}>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>{t('role', 'Role')}</TableHeader>
                <TableHeader>{t('providerName', 'Provider name')}</TableHeader>
                <TableHeader>{t('identifier', 'Identifier')}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {providers.map((encounterProvider) => (
                <TableRow key={encounterProvider.uuid}>
                  <TableCell>{encounterProvider.encounterRole?.display}</TableCell>
                  <TableCell>{encounterProvider.provider?.display}</TableCell>
                  <TableCell>{encounterProvider.provider?.identifier}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ObsAuditTable obsTree={obsTree} />
    </div>
  );
}

function BackButton({ onClick }: { onClick(): void }) {
  const { t } = useTranslation();
  return (
    <Button className={styles.backButton} kind="ghost" onClick={onClick} renderIcon={ArrowLeftIcon} size="sm">
      {t('backToEncounters', 'Back to encounters')}
    </Button>
  );
}

function formatForm(encounter: AuditEncounter): string | undefined {
  if (!encounter.form?.display) {
    return undefined;
  }
  return encounter.form.version ? `${encounter.form.display} v${encounter.form.version}` : encounter.form.display;
}
