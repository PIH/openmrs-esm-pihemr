import { ActionMenuButton2, ActivityIcon } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function WardPatientActionButton() {
  const { t } = useTranslation();

  return (
    <ActionMenuButton2
      icon={(props) => <ActivityIcon {...props} />}
      label={t('vitalSigns', 'Vital signs')}
      workspaceToLaunch={{
        workspaceName: 'o2-vital-signs-workspace',
      }}
    />
  );
}
