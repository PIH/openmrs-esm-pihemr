import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader, PageHeaderContent, PatientSearchPictogram } from '@openmrs/esm-framework';
import AuditSearch, { type AuditSearchTab, auditSearchTabs } from './audit-search.component';
import EncounterAudit from './encounter-audit.component';
import PatientRecord, { type PatientRecordView, patientRecordViews } from './patient-record.component';
import ProviderEncounters from './provider-encounters.component';
import UserEncounters from './user-encounters.component';
import styles from './audit.scss';

interface AuditLocation {
  patient?: string;
  user?: string;
  provider?: string;
  encounter?: string;
  view?: PatientRecordView;
  search?: AuditSearchTab;
}

const locationParams: Array<keyof AuditLocation> = ['patient', 'user', 'provider', 'encounter', 'view', 'search'];

/**
 * The audit trail is a drill-down — find the record, pick one of its encounters, then read what
 * was entered, changed and deleted on it. Where it is drilled down to is held in the query
 * string, so a particular encounter's audit trail can be linked to and so that the browser's back
 * button walks back up.
 */
export default function Audit() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const patientUuid = searchParams.get('patient');
  const userUuid = searchParams.get('user');
  const providerUuid = searchParams.get('provider');
  const encounterUuid = searchParams.get('encounter');

  const oneOf = <T,>(allowed: Array<T>, value: string | null, fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;
  const patientRecordView = oneOf(patientRecordViews, searchParams.get('view'), 'encounters');
  const searchTab = oneOf(auditSearchTabs, searchParams.get('search'), 'patients');

  const goTo = useCallback(
    (next: AuditLocation) => {
      const params = new URLSearchParams(searchParams);
      locationParams.forEach((param) => params.delete(param));
      if (next.patient) {
        params.set('patient', next.patient);
      }
      if (next.user) {
        params.set('user', next.user);
      }
      if (next.provider) {
        params.set('provider', next.provider);
      }
      if (next.encounter) {
        params.set('encounter', next.encounter);
      }
      if (next.view && next.view !== 'encounters') {
        params.set('view', next.view);
      }
      if (next.search && next.search !== 'patients') {
        params.set('search', next.search);
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
          onBackToEncounters={(uuid) =>
            userUuid
              ? goTo({ user: userUuid })
              : providerUuid
                ? goTo({ provider: providerUuid })
                : goTo({ patient: uuid ?? patientUuid, view: patientRecordView })
          }
        />
      ) : userUuid ? (
        <UserEncounters
          onBackToSearch={() => goTo({ search: 'users' })}
          onSelectEncounter={(uuid) => goTo({ user: userUuid, encounter: uuid })}
          userUuid={userUuid}
        />
      ) : providerUuid ? (
        <ProviderEncounters
          onBackToSearch={() => goTo({ search: 'providers' })}
          onSelectEncounter={(uuid) => goTo({ provider: providerUuid, encounter: uuid })}
          providerUuid={providerUuid}
        />
      ) : patientUuid ? (
        <PatientRecord
          onBackToSearch={() => goTo({ search: 'patients' })}
          onSelectEncounter={(uuid) => goTo({ patient: patientUuid, encounter: uuid, view: patientRecordView })}
          onSelectView={(nextView) => goTo({ patient: patientUuid, view: nextView })}
          patientUuid={patientUuid}
          view={patientRecordView}
        />
      ) : (
        <AuditSearch
          onSelectPatient={(uuid) => goTo({ patient: uuid })}
          onSelectProvider={(uuid) => goTo({ provider: uuid })}
          onSelectTab={(tab) => goTo({ search: tab })}
          onSelectUser={(uuid) => goTo({ user: uuid })}
          tab={searchTab}
        />
      )}
    </div>
  );
}
