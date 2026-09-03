import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader, PageHeaderContent, PatientSearchPictogram } from '@openmrs/esm-framework';
import EncounterAudit from './encounter-audit.component';
import PatientRecord, { type PatientRecordView, patientRecordViews } from './patient-record.component';
import PatientSearch from './patient-search.component';
import styles from './audit.scss';

/**
 * The audit trail is a three step drill-down — find a patient, pick one of their encounters, then
 * read what was entered, changed and deleted on it. The current step is held in the query string
 * so that a particular encounter's audit trail can be linked to and so that the browser's back
 * button walks back up the drill-down.
 */
export default function Audit() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const patientUuid = searchParams.get('patient');
  const encounterUuid = searchParams.get('encounter');
  const view = searchParams.get('view');
  const patientRecordView: PatientRecordView = patientRecordViews.includes(view as PatientRecordView)
    ? (view as PatientRecordView)
    : 'encounters';

  const goTo = useCallback(
    (next: { patient?: string; encounter?: string; view?: PatientRecordView }) => {
      const params = new URLSearchParams(searchParams);
      params.delete('patient');
      params.delete('encounter');
      params.delete('view');
      if (next.patient) {
        params.set('patient', next.patient);
      }
      if (next.encounter) {
        params.set('encounter', next.encounter);
      }
      if (next.view && next.view !== 'encounters') {
        params.set('view', next.view);
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  return (
    <div className={styles.container}>
      <PageHeader className={styles.pageHeader}>
        <PageHeaderContent title={t('auditTrail', 'Audit trail')} illustration={<PatientSearchPictogram />} />
      </PageHeader>
      {encounterUuid ? (
        <EncounterAudit
          encounterUuid={encounterUuid}
          onBackToEncounters={(uuid) => goTo({ patient: uuid ?? patientUuid, view: patientRecordView })}
        />
      ) : patientUuid ? (
        <PatientRecord
          onBackToSearch={() => goTo({})}
          onSelectEncounter={(uuid) => goTo({ patient: patientUuid, encounter: uuid, view: patientRecordView })}
          onSelectView={(nextView) => goTo({ patient: patientUuid, view: nextView })}
          patientUuid={patientUuid}
          view={patientRecordView}
        />
      ) : (
        <PatientSearch onSelectPatient={(uuid) => goTo({ patient: uuid })} />
      )}
    </div>
  );
}
