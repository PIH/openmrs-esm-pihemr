import { getDefaultZebraDevice } from './zebra-pdf-print';

/**
 * Fetches the medication dispense label PDF from the OpenMRS reporting REST endpoint
 * and sends it to the default Zebra printer.
 *
 * Both printMethod values require the Zebra Browser Print helper to be running on
 * the user's machine (127.0.0.1:9100). See zebra-pdf-print.ts for the distinction
 * between 'pdf-direct' and 'browser-print'.
 *
 * Vanilla JS equivalent for gsp/jQuery pages — include zebra-pdf-print.js via <script>
 * and use getDefaultZebraDevice() + device.sendFile(pdf) or device.convertAndSendFile(pdf).
 */
export async function printDispenseLabelToZebra(
  dispenseUuid: string,
  reportDefinitionUuid: string,
  reportDesignUuid: string,
  printMethod: 'pdf-direct' | 'browser-print' = 'pdf-direct',
  browserPrintFeatureKey = '',
): Promise<void> {
  const url =
    `/ws/rest/v1/reportingrest/runReport/${reportDefinitionUuid}/${reportDesignUuid}` +
    `?medicationDispenseUuid=${encodeURIComponent(dispenseUuid)}`;

  const [response, device] = await Promise.all([fetch(url, { method: 'POST' }), getDefaultZebraDevice()]);

  if (!response.ok) {
    throw new Error(`Failed to fetch label PDF: ${response.status} ${response.statusText}`);
  }
  if (!device) {
    throw new Error(
      'No Zebra printer found. Ensure the Zebra Browser Print app is running and a printer is set as default.',
    );
  }

  const pdf = await response.blob();

  if (printMethod === 'pdf-direct') {
    await device.sendFile(pdf);
  } else {
    const options = browserPrintFeatureKey ? { keys: { pdf: browserPrintFeatureKey } } : undefined;
    await device.convertAndSendFile(pdf, options);
  }
}
