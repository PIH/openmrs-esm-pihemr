import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import PatientSearch from './patient-search.component';
import ProviderSearch from './provider-search.component';
import UserSearch from './user-search.component';
import styles from './audit.scss';

export type AuditSearchTab = 'patients' | 'users' | 'providers';

export const auditSearchTabs: Array<AuditSearchTab> = ['patients', 'users', 'providers'];

interface AuditSearchProps {
  tab: AuditSearchTab;
  onSelectTab(tab: AuditSearchTab): void;
  onSelectPatient(patientUuid: string): void;
  onSelectUser(userUuid: string): void;
  onSelectProvider(providerUuid: string): void;
}

/**
 * Where the audit trail starts: find the record to audit — by the patient it belongs to, by the
 * user who changed it, or by a provider recorded on it.
 */
export default function AuditSearch({
  tab,
  onSelectTab,
  onSelectPatient,
  onSelectUser,
  onSelectProvider,
}: AuditSearchProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      <Tabs
        onChange={({ selectedIndex }) => onSelectTab(auditSearchTabs[selectedIndex])}
        selectedIndex={Math.max(0, auditSearchTabs.indexOf(tab))}>
        <TabList aria-label={t('searchBy', 'Search by')}>
          <Tab>{t('patients', 'Patients')}</Tab>
          <Tab>{t('users', 'Users')}</Tab>
          <Tab>{t('providers', 'Providers')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <PatientSearch onSelectPatient={onSelectPatient} />
          </TabPanel>
          <TabPanel>
            <UserSearch onSelectUser={onSelectUser} />
          </TabPanel>
          <TabPanel>
            <ProviderSearch onSelectProvider={onSelectProvider} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
