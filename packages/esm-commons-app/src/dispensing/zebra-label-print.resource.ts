import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { getDefaultZebraDevice } from './zebra-pdf-print';

export async function printDispenseLabelToZebra(
  dispenseUuid: string,
  reportDefinitionUuid: string,
  reportDesignUuid: string,
  printMethod: 'pdf-direct' | 'browser-print' = 'pdf-direct',
  browserPrintFeatureKey = '',
): Promise<void> {
  const url =
    `${restBaseUrl}/reportingrest/runReport/${reportDefinitionUuid}/${reportDesignUuid}` +
    `?medicationDispenseUuid=${encodeURIComponent(dispenseUuid)}`;

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
