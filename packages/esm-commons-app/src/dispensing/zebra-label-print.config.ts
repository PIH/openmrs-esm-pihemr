import { Type, validators } from '@openmrs/esm-framework';

export const zebraLabelPrintConfigSchema = {
  enabled: {
    _type: Type.Boolean,
    _description:
      "Enable the Print label button on completed medication dispense records. Requires the Zebra Browser Print desktop app to be installed and running on the user's machine.",
    _default: true,
  },
  reportDefinitionUuid: {
    _type: Type.UUID,
    _description: 'UUID of the report definition used to generate the medication dispense label PDF.',
    _default: '52f6e567-4e36-11f1-94ae-5e789c4020d9',
  },
  reportDesignUuid: {
    _type: Type.UUID,
    _description: 'UUID of the PDF report design for the medication dispense label.',
    _default: '75bde2ff-4eb4-11f1-94ae-5e789c4020d9',
  },
  printMethod: {
    _type: Type.String,
    _description:
      '"pdf-direct" sends raw PDF bytes to the printer, which renders them using its own firmware ' +
      '(requires Link-OS with apl.enable = "pdf" — no license key needed). ' +
      '"browser-print" has the Browser Print helper convert PDF→ZPL first, which works on any Zebra printer ' +
      'but requires a PDF conversion license key on Windows/macOS.',
    _default: 'browser-print',
    _validators: [validators.oneOf(['pdf-direct', 'browser-print'])],
  },
  browserPrintFeatureKey: {
    _type: Type.String,
    _description:
      'PDF conversion license key for the Browser Print helper on Windows/macOS. ' +
      'Only used when printMethod is "browser-print". Not needed on Linux with the open-source shim.',
    _default: '',
  },
};

export interface ZebraLabelPrintConfig {
  enabled: boolean;
  reportDefinitionUuid: string;
  reportDesignUuid: string;
  printMethod: 'pdf-direct' | 'browser-print';
  browserPrintFeatureKey: string;
}
