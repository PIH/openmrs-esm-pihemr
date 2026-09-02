import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, InlineNotification, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { ArrowLeftIcon, ErrorState } from '@openmrs/esm-framework';
import { canListDeletedEncounters, getPreferredIdentifier, useAuditPatient } from './audit.resource';
import { type EncounterFilters } from './encounter-filters';
import EncounterFiltersBar from './encounter-filters.component';
import PatientActivity from './patient-activity.component';
import PatientEncounters from './patient-encounters.component';
import styles from './audit.scss';

export type PatientRecordView = 'encounters' | 'activity';

export const patientRecordViews: Array<PatientRecordView> = ['encounters', 'activity'];

interface PatientRecordProps {
  patientUuid: string;
  view: PatientRecordView;
  onSelectView(view: PatientRecordView): void;
  onSelectEncounter(encounterUuid: string): void;
  onBackToSearch(): void;
}

/**
 * Step two of the audit trail. The patient's record can be read two ways — as the list of
 * encounters to drill into, or as the record of who has touched it — and both are narrowed by the
 * same filters, which is why they share this component's state rather than holding their own.
 */
export default function PatientRecord({
  patientUuid,
  view,
  onSelectView,
  onSelectEncounter,
  onBackToSearch,
}: PatientRecordProps) {
  const { t } = useTranslation();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [filters, setFilters] = useState<EncounterFilters>({});

  const { patient, error: patientError, isLoading: isLoadingPatient } = useAuditPatient(patientUuid);
  const cannotIncludeDeleted = includeDeleted && Boolean(patient) && !canListDeletedEncounters(patient);

  return (
    <div className={styles.section}>
      <Button className={styles.backButton} kind="ghost" onClick={onBackToSearch} renderIcon={ArrowLeftIcon} size="sm">
        {t('backToPatientSearch', 'Back to patient search')}
      </Button>
      <div className={styles.contextHeader}>
        <span className={styles.contextTitle}>{patient?.person?.display ?? patient?.display ?? ''}</span>
        <span className={styles.contextSubtitle}>
          {[getPreferredIdentifier(patient), patient?.person?.gender, patient?.person?.age]
            .filter((part) => part !== undefined && part !== '')
            .join(' · ')}
        </span>
      </div>

      <EncounterFiltersBar filters={filters} includeDeleted={includeDeleted} onChange={setFilters} patient={patient} />

      <div className={styles.toolbar}>
        <Checkbox
          checked={includeDeleted}
          id="include-deleted-encounters"
          labelText={t('includeDeletedEncounters', 'Include deleted encounters')}
          onChange={(_event, { checked }) => setIncludeDeleted(checked)}
        />
      </div>

      {cannotIncludeDeleted ? (
        <InlineNotification
          className={styles.inlineNotification}
          hideCloseButton
          kind="warning"
          lowContrast
          subtitle={t(
            'cannotIncludeDeletedEncounters',
            'Deleted encounters can only be listed for a patient who has an identifier.',
          )}
          title={t('deletedEncountersUnavailable', 'Deleted encounters unavailable')}
        />
      ) : null}

      {patientError ? (
        <ErrorState error={patientError} headerTitle={t('encounters', 'Encounters')} />
      ) : (
        <Tabs
          onChange={({ selectedIndex }) => onSelectView(patientRecordViews[selectedIndex])}
          selectedIndex={Math.max(0, patientRecordViews.indexOf(view))}>
          <TabList aria-label={t('auditViews', 'Audit views')}>
            <Tab>{t('encounters', 'Encounters')}</Tab>
            <Tab>{t('recordActivity', 'Patient activity')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <PatientEncounters
                filters={filters}
                includeDeleted={includeDeleted}
                isLoadingPatient={isLoadingPatient}
                onSelectEncounter={onSelectEncounter}
                patient={patient}
              />
            </TabPanel>
            <TabPanel>
              <PatientActivity
                filters={filters}
                includeDeleted={includeDeleted}
                onSelectEncounter={onSelectEncounter}
                patient={patient}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </div>
  );
}
