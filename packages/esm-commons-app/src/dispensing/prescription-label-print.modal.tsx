import React, { useCallback, useMemo, useState } from 'react';
import { Button, Checkbox, ModalBody, ModalFooter, ModalHeader, Stack } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import {
  COMPLETED_STATUS,
  type MedicationDispense,
  type MedicationRequestBundle,
} from './prescription-label-print.types';
import { printDispenseLabelsToZebra } from './zebra-label-print.resource';

interface PrescriptionLabelPrintModalProps {
  closeModal: () => void;
  encounterUuid: string;
  medicationRequestBundles: Array<MedicationRequestBundle>;
}

interface LabelOption {
  dispenseUuid: string;
  label: string;
  printable: boolean;
}

function toLabelOptions(bundles: Array<MedicationRequestBundle>): Array<LabelOption> {
  return (bundles ?? []).flatMap((bundle) =>
    (bundle.dispenses ?? [])
      .filter((dispense: MedicationDispense) => Boolean(dispense.id))
      .map((dispense) => {
        const drugName = dispense.medicationReference?.display ?? bundle.request?.medicationReference?.display ?? '';
        const quantity =
          dispense.quantity?.value != null ? ` (${dispense.quantity.value} ${dispense.quantity.unit ?? ''})` : '';
        return {
          dispenseUuid: dispense.id,
          label: `${drugName}${quantity}`.trim(),
          printable: dispense.status === COMPLETED_STATUS,
        };
      }),
  );
}

const PrescriptionLabelPrintModal: React.FC<PrescriptionLabelPrintModalProps> = ({
  closeModal,
  encounterUuid,
  medicationRequestBundles,
}) => {
  const { t } = useTranslation();
  const { medicationDispenseLabel: config } = useConfig<ConfigObject>().dispensing;
  const options = useMemo(() => toLabelOptions(medicationRequestBundles), [medicationRequestBundles]);

  // Everything is checked by default; only dispensed (completed) medications are ever checkable.
  const [printBagLabel, setPrintBagLabel] = useState(true);
  const [uncheckedDispenseUuids, setUncheckedDispenseUuids] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);

  const selectedDispenseUuids = options
    .filter((option) => option.printable && !uncheckedDispenseUuids.has(option.dispenseUuid))
    .map((option) => option.dispenseUuid);
  const nothingSelected = !printBagLabel && selectedDispenseUuids.length === 0;

  const toggleDispense = useCallback((dispenseUuid: string, checked: boolean) => {
    setUncheckedDispenseUuids((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.delete(dispenseUuid);
      } else {
        next.add(dispenseUuid);
      }
      return next;
    });
  }, []);

  const handlePrint = () => {
    setIsPrinting(true);
    printDispenseLabelsToZebra({
      dispenseUuids: selectedDispenseUuids,
      printBagLabel,
      encounterUuid,
      reportDefinitionUuid: config.reportDefinitionUuid,
      reportDesignUuid: config.reportDesignUuid,
      printMethod: config.printMethod,
      browserPrintFeatureKey: config.browserPrintFeatureKey,
    })
      .then(() => {
        showSnackbar({
          kind: 'success',
          title: t('success', 'Success'),
          subtitle: t('labelsSentToPrinter', 'Labels sent to printer'),
        });
        closeModal();
      })
      .catch((err: Error) => {
        showSnackbar({
          kind: 'error',
          title: t('printLabelsFailed', 'Print labels failed'),
          subtitle: err?.message ?? t('unknownError', 'An unknown error occurred'),
        });
        setIsPrinting(false);
      });
  };

  return (
    <React.Fragment>
      <ModalHeader closeModal={closeModal} title={t('printLabels', 'Print labels')} />
      <ModalBody>
        <Stack gap={4}>
          <p>{t('selectLabelsToPrint', 'Select the labels you want to print')}</p>
          <Checkbox
            id="print-bag-label"
            labelText={t('bagLabel', 'Bag label')}
            checked={printBagLabel}
            onChange={(_, { checked }) => setPrintBagLabel(checked)}
          />
          {options.map((option) => (
            <Checkbox
              key={option.dispenseUuid}
              id={`print-label-${option.dispenseUuid}`}
              labelText={option.label}
              helperText={option.printable ? undefined : t('notDispensed', 'Not dispensed')}
              checked={option.printable && !uncheckedDispenseUuids.has(option.dispenseUuid)}
              disabled={!option.printable}
              onChange={(_, { checked }) => toggleDispense(option.dispenseUuid, checked)}
            />
          ))}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" disabled={nothingSelected || isPrinting} onClick={handlePrint}>
          {isPrinting ? t('printing', 'Printing…') : t('print', 'Print')}
        </Button>
      </ModalFooter>
    </React.Fragment>
  );
};

export default PrescriptionLabelPrintModal;
