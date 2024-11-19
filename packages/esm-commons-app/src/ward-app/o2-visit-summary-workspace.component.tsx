import React, { useCallback, useRef } from 'react';
import { type WardPatientWorkspaceProps } from './types';
import styles from './o2-visit-summary-workspace.scss';

const O2VisitSummaryWorkspace: React.FC<WardPatientWorkspaceProps> = ({ wardPatient }) => {
  const { patient, visit } = wardPatient ?? {};
  const iframeRef = useRef<HTMLIFrameElement>();

  // hide the headers breadcrumbs and visit actions from
  const onLoad = useCallback(() => {
    const dashboard = iframeRef.current.contentDocument;
    const elementsToHide = ['header', '.patient-header', '#breadcrumbs', '.visit-actions', '#choose-another-visit'];

    const styleTag = dashboard.createElement('style');
    styleTag.innerHTML = elementsToHide.map((e) => `${e} {display: none;}`).join('\n');
    dashboard.head.appendChild(styleTag);
  }, []);

  if (patient && visit) {
    const src = `/openmrs/pihcore/visit/visit.page?patient=${patient.uuid}&visit=${visit.uuid}`;
    return (
      <div className={styles.iframeWrapper}>
        <iframe ref={iframeRef} src={src} onLoad={onLoad} className={styles.o2Iframe} />
      </div>
    );
  } else {
    return;
  }
};

export default O2VisitSummaryWorkspace;
