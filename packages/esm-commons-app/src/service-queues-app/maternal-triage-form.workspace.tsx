import { type DefaultWorkspaceProps, type Patient, showSnackbar } from '@openmrs/esm-framework';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import O2IFrame from '../ward-app/o2-iframe.component';
import { updateQueueEntry, useMutateQueueEntries } from './maternal-triage-queue-actions.resource';
import { type QueueEntry } from './types';
import { useEncounters } from '../hooks/useEncounters';
import { Loading } from '@carbon/react';
import { InlineNotification } from '@carbon/react';

interface MaternalTriageFormWorkspaceProps extends DefaultWorkspaceProps {
  queueEntry: QueueEntry;
  patient: Patient;
}

const MATERNAL_TRIAGE_FORM_ENCOUNTER_TYPE = '41911448-71a1-43d7-bba8-dc86339850da';

/**
 * Workspace to display the Maternal Triage HTML Form, rendered in a iframe
 */
const MaternalTriageFormWorkspace: React.FC<MaternalTriageFormWorkspaceProps> = ({
  queueEntry,
  patient,
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const { mutateQueueEntries } = useMutateQueueEntries();
  const {
    data: filledOutTriageForms,
    isLoading,
    error,
  } = useEncounters({
    patient: patient.uuid,
    visit: queueEntry.visit.uuid,
    encounterType: MATERNAL_TRIAGE_FORM_ENCOUNTER_TYPE,
  });

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.data == 'triageFormSubmitted') {
        const endQueueEntry = () => {
          return updateQueueEntry(queueEntry.uuid, {
            endedAt: new Date().toISOString(),
          });
        };

        await endQueueEntry();
        await mutateQueueEntries();
        closeWorkspace();
        showSnackbar({
          isLowContrast: true,
          kind: 'success',
          title: t('triageFormSubmitted', 'Triage form successfully submitted for {{patient}}.', {
            patient: patient.person.display,
          }),
        });
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const patientUuid = patient.uuid;
  const visitUuid = queueEntry.visit.id;

  const elementsToHide = [
    'header',
    '#breadcrumbs',

    // prevent O2 success toast from showing; After submitting form for a patient,
    // the success toast for that patient shows when opening form for another patient
    '.toast-type-success',
  ];

  const customJavaScript = `
    htmlForm.setSuccessFunction(() => window.top.postMessage('triageFormSubmitted'))
  `;

  if (isLoading) {
    return <Loading withOverlay={false} small />;
  } else if (error) {
    return (
      <InlineNotification
        kind="error"
        lowContrast={true}
        hideCloseButton={true}
        title={t('errorLoadingPatientForm', 'Error loading patient form')}
      />
    );
  } else {
    // If patient does not have triage form filled out already, we load a new one,
    // else, we load the last filled out form to edit
    const src =
      filledOutTriageForms.length == 0
        ? `${window.openmrsBase}/htmlformentryui/htmlform/enterHtmlFormWithStandardUi.page?patientId=${patientUuid}&visitId=${visitUuid}&definitionUiResource=file:configuration/pih/htmlforms/triage.xml&returnUrl=%2Fopenmrs%2Fcoreapps%2Fclinicianfacing%2Fpatient.page%3FpatientId%3D${patientUuid}%26`
        : `${window.openmrsBase}/htmlformentryui/htmlform/editHtmlFormWithStandardUi.page?patientId=${patientUuid}&encounterId=${filledOutTriageForms[filledOutTriageForms.length - 1].uuid}`;

    return <O2IFrame key={patientUuid} src={src} elementsToHide={elementsToHide} customJavaScript={customJavaScript} />;
  }
};

export default MaternalTriageFormWorkspace;
