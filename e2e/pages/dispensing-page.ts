import { expect, type Page } from '@playwright/test';
import { step, test } from '../core';

export class DispensingPage {
  private constructor(readonly page: Page) {}

  // ── Main dispensing page ──────────────────────────────────────────────────
  readonly fillPaperPrescriptionButton = () => this.page.getByRole('button', { name: 'Fill paper prescription' });
  readonly patientSearchBar = () => this.page.getByTestId('patientSearchBar');
  readonly ordererCombobox = () => this.page.getByRole('combobox', { name: 'Orderer' });
  readonly activePrescriptionsTab = () => this.page.getByRole('tab', { name: 'Active prescriptions' });
  readonly allPrescriptionsTab = () => this.page.getByRole('tab', { name: 'All prescriptions' });
  readonly prescriptionSearchBox = () => this.page.getByRole('searchbox', { name: 'Search by patient ID or name' });

  patientSearchResult(patientIdentifier: string) {
    // Patient result cards render as role="banner" (i.e. <header>) in the search results panel
    return this.page.getByRole('banner').filter({ hasText: patientIdentifier });
  }

  // ── Prescription table ────────────────────────────────────────────────────
  prescriptionRow(patientName: string) {
    // The given name in test fixtures includes an ISO timestamp (e.g. "Jane2026-04-10T19:36:52.123Z"),
    // but the table cell truncates it at the minute level. Splitting on "T" gives the stable
    // date prefix (e.g. "Doe E2E, Jane2026-04-10") which is always a substring of what's displayed.
    const stablePrefix = patientName.split('T')[0];
    return this.page.getByRole('row').filter({ hasText: stablePrefix });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  @step
  static async open(page: Page) {
    return test.step('When I navigate to the dispensing page', async () => {
      const dispensingPage = new DispensingPage(page);
      await page.goto('/openmrs/spa/dispensing');
      await page.getByRole('button', { name: 'Fill paper prescription' }).waitFor({ state: 'visible' });
      return dispensingPage;
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Opens the "Fill paper prescription" panel, selects the patient by identifier,
   * sets the order location, and picks the orderer.
   */
  @step
  async createPaperPrescription(patientIdentifier: string, orderLocation: string, ordererName: string) {
    return test.step(`When I start a paper prescription for patient ${patientIdentifier}`, async () => {
      await this.fillPaperPrescriptionButton().click();
      await this.patientSearchBar().fill(patientIdentifier);
      await this.patientSearchResult(patientIdentifier).waitFor({ state: 'visible' });
      await this.patientSearchResult(patientIdentifier).click();
      await this.page.locator('#order-basket').getByText(orderLocation).click();
      await this.ordererCombobox().click();
      await this.page.locator('#order-basket').getByText(ordererName).click();
      return new DispensingPage.OrderBasket(this.page);
    });
  }

  @step
  async openActivePrescriptionsTab() {
    return test.step('When I open the Active prescriptions tab', async () => {
      await this.activePrescriptionsTab().click();
    });
  }

  @step
  async openAllPrescriptionsTab() {
    return test.step('When I open the All prescriptions tab', async () => {
      await this.allPrescriptionsTab().click();
    });
  }

  @step
  async searchPrescriptions(searchTerm: string) {
    return test.step(`When I search active prescriptions tab for "${searchTerm}"`, async () => {
      await this.prescriptionSearchBox().fill(searchTerm);
    });
  }

  @step
  async selectLocationForActivePrescriptionTableFilter(locationName: string) {
    return test.step(`When I change the location selection filter to include "${locationName}"`, async () => {
      await this.page.getByRole('combobox').filter({ hasText: 'Filter by locations' }).click();
      await this.page.getByRole('option', { name: locationName }).click();
    });
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  @step
  async expectPrescriptionRowForPatient(
    patientName: string,
    drugName: string,
    status: 'Active' | 'Completed' | 'Cancelled' | 'Expired',
  ) {
    return test.step(`Then I should see a prescription row for ${patientName} containing ${drugName} with status ${status}`, async () => {
      const row = this.prescriptionRow(patientName);
      await expect(row).toBeVisible();
      await expect(row.getByRole('cell', { name: status })).toBeVisible();
      await expect(row.getByRole('cell', { name: new RegExp(drugName) })).toBeVisible();
    });
  }

  @step
  async expectNoPrescriptionForPatient(patientName: string) {
    return test.step(`Then I should not see a prescription row for ${patientName}`, async () => {
      await expect(this.prescriptionRow(patientName)).toHaveCount(0);
    });
  }

  static OrderBasket = class OrderBasket {
    constructor(private page: Page) {}

    readonly addDrugButton = () => this.page.getByRole('button', { name: 'Add' });
    readonly drugSearchBox = () => this.page.getByRole('searchbox', { name: 'Search for a drug' });
    readonly addToBasketButton = () => this.page.getByRole('button', { name: 'Add to basket' }).first();
    readonly saveOrderButton = () => this.page.getByRole('button', { name: 'Save order' });
    readonly signAndCloseButton = () => this.page.getByRole('button', { name: 'Sign and close' });
    readonly createOrderWithoutDispensingButton = () =>
      this.page.getByRole('button', { name: /^Create order without dispensing/ });
    readonly dispenseAllPrescriptionsButton = () =>
      this.page.getByRole('button', { name: /^Dispense all prescriptions/ });

    readonly doseInput = () => this.page.getByRole('spinbutton', { name: 'Dose' });
    readonly routeCombobox = () => this.page.getByRole('combobox', { name: 'Route' });
    readonly frequencyCombobox = () => this.page.getByRole('combobox', { name: 'Frequency' });
    readonly durationInput = () => this.page.getByRole('spinbutton', { name: 'Duration' });
    readonly quantityInput = () => this.page.getByRole('spinbutton', { name: 'Quantity to dispense' });
    readonly refillsInput = () => this.page.getByRole('spinbutton', { name: 'Prescription refills' });

    @step
    async addDrugToBasket(drugSearchTerm: string) {
      return test.step(`When I search for "${drugSearchTerm}" and add the first result to the basket`, async () => {
        await this.addDrugButton().click();
        await this.drugSearchBox().fill(drugSearchTerm);
        await this.addToBasketButton().click();
      });
    }

    @step
    async openIncompleteOrder(drugName: string) {
      return test.step(`When I open the incomplete order form for "${drugName}"`, async () => {
        await this.page
          .getByRole('listitem')
          .filter({ hasText: `Incomplete${drugName}` })
          .click();
      });
    }

    @step
    async fillDrugOrderForm({
      dose,
      route,
      frequency,
      duration,
      quantity,
      refills,
    }: {
      dose: string;
      route: string;
      frequency: string;
      duration: string;
      quantity: string;
      refills: string;
    }) {
      return test.step('When I fill out the drug order form', async () => {
        await this.doseInput().fill(dose);
        await this.routeCombobox().click();
        await this.page.getByText(route, { exact: true }).click();
        await this.frequencyCombobox().click();
        await this.page.getByText(frequency).click();
        await this.durationInput().fill(duration);
        await this.quantityInput().fill(quantity);
        await this.refillsInput().fill(refills);
      });
    }

    async saveOrder() {
      return test.step('When I click save order', async () => {
        await this.saveOrderButton().click();
      });
    }

    @step
    async signOrder() {
      return test.step('When I click sign order', async () => {
        await this.signAndCloseButton().click();
      });
    }

    @step
    async createOrderWithoutDispensing() {
      return test.step('When I confirm creating the order without dispensing', async () => {
        await this.createOrderWithoutDispensingButton().click();
      });
    }

    @step
    async createOrderAnddispenseAllPrescriptions() {
      return test.step('When I confirm dispense all prescriptions', async () => {
        await this.dispenseAllPrescriptionsButton().click();
      });
    }
  };
}
