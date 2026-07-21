import {
  closeWorkspaceGroup2,
  ExtensionSlot,
  openmrsFetch,
  restBaseUrl,
  showSnackbar,
  Workspace2,
} from '@openmrs/esm-framework';
import React, { useEffect, useRef } from 'react';
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
      if (!settings.type || settings.type.toUpperCase() !== 'POST') {
        return;
      }

      const returnUrl = settings.data instanceof FormData ? (settings.data.get('returnUrl') || '') : '';

      // A "Save & Print" form (eg. a discharge disposition) carries printForm=true in its
      // returnUrl. When present, the form will reload the visit page and auto-print, so tell
      // the parent a print is pending and it should wait for it before closing the workspace.
      const printPending = returnUrl.indexOf('printForm=true') !== -1 || returnUrl.indexOf('printForm%3Dtrue') !== -1;

      window.parent.postMessage({ type: 'o2IframeFormSubmit', printPending: printPending }, '*');
    });
  `;

  // Holds the "is the patient discharged?" check for a submitted "Save & Print" form while we
  // wait for that form to finish printing. Set on form submit, consumed once printing completes.
  const pendingPrintDischargeRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    // Returns whether the patient is no longer admitted to the ward.
    const isPatientDischarged = () =>
      openmrsFetch(
        `${restBaseUrl}/emrapi/inpatient/admission?patients=${patient?.uuid}&currentInpatientLocation=${inpatientAdmission?.currentInpatientLocation?.uuid}`,
      )
        .then((response) => response.ok && response.data.results.length === 0)
        .catch((error) => {
          console.error('Error checking inpatient admission status:', error);
          return false;
        });

    const removePatientFromWard = () => {
      closeWorkspaceGroup2();
      showSnackbar({
        title: t('patientDischarged', 'Patient discharged'),
        subtitle: t('patientDischargedMessage', '{{patientName}} has been discharged from the ward.', {
          patientName: patient.person.display,
        }),
        kind: 'success',
      });
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'o2IframeFormSubmit') {
        const dischargedPromise = isPatientDischarged();
        if (event.data.printPending) {
          // The form will reload the visit page and auto-print. Closing the workspace now would
          // destroy the iframe before it can print, so defer the discharge until printing is done
          // (see the 'o2IframeFormPrinted' message posted from visit.js once the print completes).
          pendingPrintDischargeRef.current = dischargedPromise;
        } else {
          dischargedPromise.then((discharged) => {
            if (discharged) {
              removePatientFromWard();
            }
          });
        }
      } else if (event.data?.type === 'o2IframeFormPrinted') {
        const dischargedPromise = pendingPrintDischargeRef.current;
        pendingPrintDischargeRef.current = null;
        dischargedPromise?.then((discharged) => {
          if (discharged) {
            removePatientFromWard();
          }
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
