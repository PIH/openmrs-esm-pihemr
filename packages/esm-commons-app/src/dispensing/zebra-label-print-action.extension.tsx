import React, { useState } from 'react';
import { OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { printDispenseLabelToZebra } from './zebra-label-print.resource';

// Minimal interface — mirrors the relevant fields from the dispensing app's MedicationDispense type
// without introducing a hard dependency on that module.
interface MedicationDispense {
  id?: string;
  status?: string;
}

interface ZebraLabelPrintActionProps {
  medicationDispense: MedicationDispense;
  patientUuid: string;
  encounterUuid: string;
  closeMenu?: () => void;
}

const COMPLETED_STATUS = 'completed';

const ZebraLabelPrintAction: React.FC<ZebraLabelPrintActionProps> = ({ medicationDispense, closeMenu }) => {
  const { t } = useTranslation();
  const { medicationDispenseLabel: config } = useConfig<ConfigObject>().dispensing;
  const [isPrinting, setIsPrinting] = useState(false);

  if (!config.enabled || medicationDispense?.status !== COMPLETED_STATUS || !medicationDispense?.id) {
    return null;
  }

  const handlePrint = () => {
    closeMenu?.();
    setIsPrinting(true);
    printDispenseLabelToZebra(
      medicationDispense.id,
      config.reportDefinitionUuid,
      config.reportDesignUuid,
      config.printMethod,
      config.browserPrintFeatureKey,
    )
      .then(() => {
        showSnackbar({
          kind: 'success',
          title: t('success', 'Success'),
          subtitle: t('labelSentToPrinter', 'Label sent to printer'),
        });
      })
      .catch((err: Error) => {
        showSnackbar({
          kind: 'error',
          title: t('printLabelFailed', 'Print label failed'),
          subtitle: err?.message ?? t('unknownError', 'An unknown error occurred'),
        });
      })
      .finally(() => setIsPrinting(false));
  };

  return (
    <OverflowMenuItem
      itemText={isPrinting ? t('printing', 'Printing…') : t('printLabel', 'Print label')}
      disabled={isPrinting}
      onClick={handlePrint}
    />
  );
};

export default ZebraLabelPrintAction;
