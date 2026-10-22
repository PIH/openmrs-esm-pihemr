import React from 'react';
import { render, screen } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import PrescriptionLabelPrintAction from './prescription-label-print-action.extension';
import { type MedicationRequestBundle } from './prescription-label-print.types';

const mockUseConfig = jest.mocked(useConfig);

const bundle = (status: string): MedicationRequestBundle => ({
  request: { id: 'request-1' },
  dispenses: [{ id: 'dispense-1', status }],
});

function renderAction(bundles: Array<MedicationRequestBundle>) {
  render(
    <PrescriptionLabelPrintAction
      encounterUuid="encounter-uuid"
      patientUuid="patient-uuid"
      medicationRequestBundles={bundles}
    />,
  );
}

describe('PrescriptionLabelPrintAction', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ dispensing: { medicationDispenseLabel: { enabled: true } } });
  });

  it('shows the button when at least one medication is dispensed', () => {
    renderAction([bundle('on-hold'), bundle('completed')]);

    expect(screen.getByRole('button', { name: /print labels/i })).toBeInTheDocument();
  });

  it('hides the button when no medication is dispensed', () => {
    renderAction([bundle('on-hold'), { request: { id: 'request-2' }, dispenses: [] }]);

    expect(screen.queryByRole('button', { name: /print labels/i })).not.toBeInTheDocument();
  });

  it('hides the button when label printing is disabled', () => {
    mockUseConfig.mockReturnValue({ dispensing: { medicationDispenseLabel: { enabled: false } } });
    renderAction([bundle('completed')]);

    expect(screen.queryByRole('button', { name: /print labels/i })).not.toBeInTheDocument();
  });
});
