import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { getDefaultZebraDevice } from './zebra-pdf-print';

export interface PrintDispenseLabelsOptions {
  /** Medication dispenses to print a label for; one page is printed per dispense. */
  dispenseUuids: Array<string>;
  /** Also print the summary label for the outer bag. */
  printBagLabel?: boolean;
  /** Prescription encounter, used by the report to build the bag label. */
  encounterUuid?: string;
  reportDefinitionUuid: string;
  reportDesignUuid: string;
  printMethod?: 'pdf-direct' | 'browser-print';
  browserPrintFeatureKey?: string;
}

export async function printDispenseLabelsToZebra({
  dispenseUuids,
  printBagLabel = false,
  encounterUuid,
  reportDefinitionUuid,
  reportDesignUuid,
  printMethod = 'pdf-direct',
  browserPrintFeatureKey = '',
}: PrintDispenseLabelsOptions): Promise<void> {
  // The reporting REST endpoint only reads single-valued parameters, so the list is sent comma-separated.
  const params = new URLSearchParams({
    medicationDispenseUuids: dispenseUuids.join(','),
    printBagLabel: String(printBagLabel),
  });
  if (encounterUuid) {
    params.set('encounterUuid', encounterUuid);
  }
  const url = `${restBaseUrl}/reportingrest/runReport/${reportDefinitionUuid}/${reportDesignUuid}?${params.toString()}`;

  const [response, device] = await Promise.all([openmrsFetch(url, { method: 'POST' }), getDefaultZebraDevice()]);

  const pdf = await response.blob();

  if (device) {
    try {
      if (printMethod === 'pdf-direct') {
        await device.sendFile(pdf);
      } else {
        const options = browserPrintFeatureKey ? { keys: { pdf: browserPrintFeatureKey } } : undefined;
        await device.convertAndSendFile(pdf, options);
      }
      return;
    } catch {
      // fall through to browser print dialog
    }
  }

  openBrowserPrintDialog(pdf);
}

function openBrowserPrintDialog(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none;';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60_000);
  };
}
