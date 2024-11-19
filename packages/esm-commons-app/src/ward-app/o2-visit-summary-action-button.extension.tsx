import { ActionMenuButton, launchWorkspace, UserAvatarIcon } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WardPatientWorkspaceProps } from './types';

export default function WardPatientActionButton() {
  const { t } = useTranslation();

  return (
    <ActionMenuButton
      getIcon={(props) => <UserAvatarIcon {...props} />}
      label={t('visitSummary', 'Visit summary')}
      iconDescription={t('patientVisitSummary', 'Patient visit summary')}
      handler={() => launchWorkspace<WardPatientWorkspaceProps>('o2-visit-summary-workspace')}
      type={'o2-visit-summary'}
    />
  );
}
