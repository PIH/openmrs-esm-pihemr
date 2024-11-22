import { useAppContext } from '@openmrs/esm-framework';
import React, { useCallback, useRef } from 'react';
import styles from './o2-pregnancy-infant-dashboard.scss';
import { type MaternalWardViewContext } from './types';

/**
 * Extension to display either the O2 pregnancy program or infant program dashboard,
 * depending on whether patient is mother or infant.
 */
const O2PregnancyInfantProgramDashboard: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const iframeRef = useRef<HTMLIFrameElement>();

  const { motherChildRelationships } = useAppContext<MaternalWardViewContext>('maternal-ward-view-context') ?? {};
  const isInfant = motherChildRelationships?.motherByChildUuid?.has(patientUuid);

  const infantProgramUuid = 'dc1b588a-9b94-45e4-8346-71b7c9a24845';
  const pregnancyProgramUuid = '6a5713c2-3fd5-46e7-8f25-36a0f7871e12';
  const dashboardUuid = isInfant ? infantProgramUuid : pregnancyProgramUuid;

  // hide the headers, breadcrumbs and various sections of the dashboards
  const onLoad = useCallback(() => {
    const dashboard = iframeRef.current.contentDocument;
    const elementsToHide = [
      'header',
      '.patient-header',
      '#breadcrumbs',
      '.action-section',
      '.visits-section',
      '.pregnancy\\.dashboard\\.ancInitialEncounters',
      '.pregnancy\\.dashboard\\.ancFollowupEncounters',
      '.patient-location',
      '.pregnancy\\.dashboard\\.currentEnrollment',
      '.infant\\.dashboard\\.newbornAssesmentEncounters',
      '.infant\\.dashboard\\.newbornDailyProgressEncounters',
      '.infant\\.dashboard\\.currentEnrollment',
      '.program-history',
    ];

    const styleTag = dashboard.createElement('style');
    styleTag.innerHTML = elementsToHide.map((e) => `${e} {display: none !important;}`).join('\n');
    dashboard.head.appendChild(styleTag);
  }, []);

  if (patientUuid) {
    const src = `${window.openmrsBase}/coreapps/clinicianfacing/patient.page?patientId=${patientUuid}&dashboard=${dashboardUuid}`;
    return (
      <div className={styles.iframeWrapper} key={patientUuid}>
        <iframe ref={iframeRef} src={src} onLoad={onLoad} className={styles.o2Iframe} />
      </div>
    );
  } else {
    return;
  }
};

export default O2PregnancyInfantProgramDashboard;
