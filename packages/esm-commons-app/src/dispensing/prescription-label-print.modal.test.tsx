import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import PrescriptionLabelPrintModal from './prescription-label-print.modal';
import { printDispenseLabelsToZebra } from './zebra-label-print.resource';
import { type MedicationRequestBundle } from './prescription-label-print.types';

jest.mock('./zebra-label-print.resource', () => ({
  printDispenseLabelsToZebra: jest.fn(),
}));

// Carbon's ModalBody observes its size, which jsdom does not provide
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const mockUseConfig = jest.mocked(useConfig);
const mockPrint = jest.mocked(printDispenseLabelsToZebra);

const config = {
  dispensing: {
    medicationDispenseLabel: {
      enabled: true,
      reportDefinitionUuid: 'definition-uuid',
      reportDesignUuid: 'design-uuid',
      printMethod: 'browser-print',
      browserPrintFeatureKey: '',
    },
  },
};

const bundles: Array<MedicationRequestBundle> = [
  {
    request: { id: 'request-1', medicationReference: { display: 'Aspirin' } },
    dispenses: [{ id: 'dispense-1', status: 'completed', medicationReference: { display: 'Aspirin' } }],
  },
  {
    request: { id: 'request-2', medicationReference: { display: 'Ibuprofen' } },
    dispenses: [{ id: 'dispense-2', status: 'on-hold', medicationReference: { display: 'Ibuprofen' } }],
  },
  {
    request: { id: 'request-3', medicationReference: { display: 'Zinc' } },
    dispenses: [{ id: 'dispense-3', status: 'completed', medicationReference: { display: 'Zinc' } }],
  },
];

function renderModal(closeModal = jest.fn()) {
  render(
    <PrescriptionLabelPrintModal
      closeModal={closeModal}
      encounterUuid="encounter-uuid"
      medicationRequestBundles={bundles}
    />,
  );
  return closeModal;
}

describe('PrescriptionLabelPrintModal', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue(config);
    mockPrint.mockResolvedValue(undefined);
  });

  it('checks the bag label and all dispensed medications by default', () => {
    renderModal();

    expect(screen.getByRole('checkbox', { name: /bag label/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /aspirin/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /zinc/i })).toBeChecked();
  });

  it('only lets dispensed medications be checked', () => {
    renderModal();

    const notDispensed = screen.getByRole('checkbox', { name: /ibuprofen/i });
    expect(notDispensed).toBeDisabled();
    expect(notDispensed).not.toBeChecked();
  });

  it('prints the checked labels', async () => {
    const user = userEvent.setup();
    const closeModal = renderModal();

    await user.click(screen.getByRole('checkbox', { name: /zinc/i }));
    await user.click(screen.getByRole('button', { name: /^print$/i }));

    await waitFor(() => expect(mockPrint).toHaveBeenCalled());
    expect(mockPrint).toHaveBeenCalledWith(
      expect.objectContaining({
        dispenseUuids: ['dispense-1'],
        printBagLabel: true,
        encounterUuid: 'encounter-uuid',
        reportDefinitionUuid: 'definition-uuid',
        reportDesignUuid: 'design-uuid',
      }),
    );
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
  });

  it('can print only the bag label', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('checkbox', { name: /aspirin/i }));
    await user.click(screen.getByRole('checkbox', { name: /zinc/i }));
    await user.click(screen.getByRole('button', { name: /^print$/i }));

    await waitFor(() => expect(mockPrint).toHaveBeenCalled());
    expect(mockPrint).toHaveBeenCalledWith(expect.objectContaining({ dispenseUuids: [], printBagLabel: true }));
  });

  it('disables printing when nothing is checked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('checkbox', { name: /bag label/i }));
    await user.click(screen.getByRole('checkbox', { name: /aspirin/i }));
    await user.click(screen.getByRole('checkbox', { name: /zinc/i }));

    expect(screen.getByRole('button', { name: /^print$/i })).toBeDisabled();
  });
});
