import React from 'react';
import { useTranslation } from 'react-i18next';
import O2IFrame from './o2-iframe.component';
import { type WardPatientWorkspaceProps } from './types';

const LABOUR_DELIVERY_SUMMARY_ENCOUNTER_TYPE = 'fec2cc56-e35f-42e1-8ae3-017142c1ca59';
const MATERNAL_ADMISSION_ENCOUNTER_TYPE = '0ef67d23-0cf4-4a3e-8617-ac9d55bdd005';
const POSTPARTUM_DAILY_PROGRESS = '37f04ddf-9653-4a02-98b4-1c23734c2f15';

const toClass = (encounterUuid: string) => '.encounterType-' + encounterUuid;

const O2VisitSummaryWorkspace: React.FC<WardPatientWorkspaceProps> = ({ wardPatient }) => {
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
    $('#formBreadcrumb').show();
    $('.simple-form-ui form section').width(300);
    $('#nav-buttons').hide();
  `;

  if (patient && visit) {
    const src = `${window.openmrsBase}/pihcore/visit/visit.page?patient=${patient.uuid}&visit=${visit.uuid}`;
    return <O2IFrame src={src} elementsToHide={elementsToHide} customJavaScript={customJavaScript} />;
  } else {
    return <div>{t('patientHasNoActiveVisit', 'Patient has no active visit')}</div>;
  }
};

export default O2VisitSummaryWorkspace;
