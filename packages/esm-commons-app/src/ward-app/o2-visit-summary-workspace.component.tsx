import { ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import O2IFrame from './o2-iframe.component';
import type { WardPatient, WardPatientWorkspaceProps } from './types';

const LABOUR_DELIVERY_SUMMARY_ENCOUNTER_TYPE = 'fec2cc56-e35f-42e1-8ae3-017142c1ca59';
const MATERNAL_ADMISSION_ENCOUNTER_TYPE = '0ef67d23-0cf4-4a3e-8617-ac9d55bdd005';
const POSTPARTUM_DAILY_PROGRESS = '37f04ddf-9653-4a02-98b4-1c23734c2f15';

const toClass = (encounterUuid: string) => '.encounterType-' + encounterUuid;

// partial type defined in esm-ward-app
interface WardViewContext {
  WardPatientHeader: React.FC<{ wardPatient: WardPatient }>;
}

const O2VisitSummaryWorkspace: React.FC<WardPatientWorkspaceProps> = (props) => {
  const { wardPatient } = props;
  const { patient, visit } = wardPatient ?? {};

  const { t } = useTranslation();

  const elementsToHide = [
    'header',
    '.patient-header',
    '#breadcrumbs',
    '.visit-actions',
    '#choose-another-visit',
    toClass(LABOUR_DELIVERY_SUMMARY_ENCOUNTER_TYPE),
    toClass(MATERNAL_ADMISSION_ENCOUNTER_TYPE),
    toClass(POSTPARTUM_DAILY_PROGRESS),
  ];
  const customJavaScript = `
    jQuery('#formBreadcrumb').show();
    jQuery('.simple-form-ui form section').width(jQuery('#htmlform').width() - jQuery('#formBreadcrumb').width() - 30);
    jQuery('#nav-buttons').hide();
  `;

  const iframeSrc =
    patient && visit
      ? `${window.openmrsBase}/pihcore/visit/visit.page?patient=${patient.uuid}&visit=${visit.uuid}`
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

export default O2VisitSummaryWorkspace;
