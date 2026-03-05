import {
  closeWorkspaceGroup2,
  ExtensionSlot,
  openmrsFetch,
  restBaseUrl,
  showSnackbar,
  Workspace2,
} from '@openmrs/esm-framework';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import O2IFrame from './o2-iframe.component';
import type { WardPatientWorkspaceDefinition } from './types';

const O2VisitSummaryWorkspace: React.FC<WardPatientWorkspaceDefinition> = ({ groupProps: { wardPatient } }) => {
  const { patient, visit, inpatientAdmission } = wardPatient ?? {};

  const { t } = useTranslation();

  const elementsToHide = ['header', '.patient-header', '#breadcrumbs', '.visit-actions', '#choose-another-visit'];
  const customJavaScript = `
    jQuery('#formBreadcrumb').show();
    jQuery('.simple-form-ui form section').width(400);
    jQuery('#nav-buttons').hide();

    jQuery(document).ajaxComplete(function(event, xhr, settings) {
      if (settings.type && settings.type.toUpperCase() === 'POST') {
        window.parent.postMessage({ type: 'o2IframeFormSubmit' }, '*');
      }
    });
  `;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'o2IframeFormSubmit') {
        // check whether patient is still admitted. If not, close the workspace group
        openmrsFetch(
          `${restBaseUrl}/emrapi/inpatient/admission?patients=${patient?.uuid}&currentInpatientLocation=${inpatientAdmission?.currentInpatientLocation?.uuid}`,
        )
          .then((response) => {
            if (response.ok && response.data.results.length === 0) {
              closeWorkspaceGroup2();
              showSnackbar({
                title: t('patientDischarged', 'Patient discharged'),
                subtitle: t('patientDischargedMessage', '{{patientName}} has been discharged from the ward.', {
                  patientName: patient.person.display,
                }),
                kind: 'success',
              });
            }
          })
          .catch((error) => {
            console.error('Error checking inpatient admission status:', error);
          });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const iframeSrc =
    patient && visit
      ? `${window.openmrsBase}/pihcore/visit/visit.page?patient=${patient.uuid}&visit=${visit.uuid}`
      : null;

  return (
    <Workspace2 title={t('visitSummary', 'Visit summary')} hasUnsavedChanges={false}>
      <ExtensionSlot name="ward-workspace-patient-banner-slot" state={{ wardPatient }} />
      {iframeSrc ? (
        <O2IFrame src={iframeSrc} elementsToHide={elementsToHide} customJavaScript={customJavaScript} />
      ) : (
        <div>{t('patientHasNoActiveVisit', 'Patient has no active visit')}</div>
      )}
    </Workspace2>
  );
};

export default O2VisitSummaryWorkspace;
