import React, { useCallback } from 'react';
import { Button } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { showModal, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { COMPLETED_STATUS, type MedicationRequestBundle } from './prescription-label-print.types';

interface PrescriptionLabelPrintActionProps {
  encounterUuid: string;
  patientUuid: string;
  medicationRequestBundles: Array<MedicationRequestBundle>;
}

const PrescriptionLabelPrintAction: React.FC<PrescriptionLabelPrintActionProps> = ({
  encounterUuid,
  medicationRequestBundles,
}) => {
  const { t } = useTranslation();
  const { medicationDispenseLabel: config } = useConfig<ConfigObject>().dispensing;

  const handleClick = useCallback(() => {
    const dispose = showModal('prescription-label-print-modal', {
      closeModal: () => dispose(),
      encounterUuid,
      medicationRequestBundles,
    });
  }, [encounterUuid, medicationRequestBundles]);

  const hasDispensedMedication = medicationRequestBundles?.some((bundle) =>
    bundle.dispenses?.some((dispense) => dispense.id && dispense.status === COMPLETED_STATUS),
  );

  if (!config.enabled || !hasDispensedMedication) {
    return null;
  }

  return (
    <Button kind="ghost" renderIcon={Printer} iconDescription={t('print', 'Print')} onClick={handleClick}>
      {t('printLabels', 'Print labels')}
    </Button>
  );
};

export default PrescriptionLabelPrintAction;
