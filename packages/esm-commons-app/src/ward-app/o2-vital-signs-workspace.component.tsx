import { ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import O2IFrame from './o2-iframe.component';
import type { WardPatientWorkspaceProps } from './types';

const O2VitalSignsWorkspace: React.FC<WardPatientWorkspaceProps> = (props) => {
  const { wardPatient } = props;
  const { patient, visit } = wardPatient ?? {};

  const { t } = useTranslation();

  const elementsToHide = [
    'header',
    '.patient-header',
    '#breadcrumbs',
    '.visit-actions',
    '#choose-another-visit',
    '.cancel',
  ];
  const customJavaScript = `
    jQuery('#formBreadcrumb').show();
    jQuery('.simple-form-ui form section').width(400);
    jQuery('#nav-buttons').hide();
  `;

  const iframeSrc =
    patient && visit
      ? `${window.openmrsBase}/htmlformentryui/htmlform/enterHtmlFormWithStandardUi.page?patientId=${patient.uuid}&visitId=${visit.uuid}&definitionUiResource=file:configuration/pih/htmlforms/inpatientVitals.xml&returnUrl=${window.openmrsBase}/pihcore/visit/visit.page?patient=${patient.uuid}&visit=${visit.uuid}`
      : null;

  return (
    <>
      <ExtensionSlot name="ward-workspace-patient-banner-slot" state={{ wardPatient }} />
      {iframeSrc ? (
        <O2IFrame src={iframeSrc} elementsToHide={elementsToHide} customJavaScript={customJavaScript} />
      ) : (
        <div>{t('patientHasNoActiveVisit', 'Patient has no active visit')}</div>
      )}
    </>
  );
};

export default O2VitalSignsWorkspace;
