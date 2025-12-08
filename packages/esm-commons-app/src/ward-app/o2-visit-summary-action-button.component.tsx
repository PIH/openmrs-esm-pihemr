import { ActionMenuButton2, CalendarHeatMapIcon } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function WardPatientActionButton() {
  const { t } = useTranslation();

  return (
    <ActionMenuButton2
      icon={(props) => <CalendarHeatMapIcon {...props} />}
      label={t('visitSummary', 'Visit summary')}
      workspaceToLaunch={{
        workspaceName: 'o2-visit-summary-workspace',
      }}
    />
  );
}
