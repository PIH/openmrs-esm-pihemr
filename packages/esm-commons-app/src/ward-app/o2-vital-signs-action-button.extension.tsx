import { ActionMenuButton, launchWorkspace, InformationFilledIcon } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WardPatientWorkspaceProps } from './types';

export default function WardPatientActionButton() {
  const { t } = useTranslation();

  return (
    <ActionMenuButton
      getIcon={(props) => <InformationFilledIcon {...props} />}
      label={t('vitalSigns', 'Vital signs')}
      iconDescription={t('inpatientVitalSigns', 'Inpatient vital signs')}
      handler={() => launchWorkspace<WardPatientWorkspaceProps>('o2-vital-signs-workspace')}
      type={'o2-vital-signs'}
    />
  );
}
