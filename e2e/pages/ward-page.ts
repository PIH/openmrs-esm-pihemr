import { expect, type Page } from '@playwright/test';
import { test } from '../core';
import { type Patient } from '@openmrs/esm-framework';
import { getPatientIdentifierStr, getPatientName } from '../commands';

/**
 * Mostly taken from openmrs-esm-patient-management
 */
export class WardPage {
  private constructor(readonly page: Page) {}

  readonly manageAdmissionRequestsButton = () => this.page.getByRole('button', { name: 'Manage' });
  readonly cancelButton = () => this.page.getByRole('button', { name: 'Cancel' });
  readonly saveButton = () => this.page.getByRole('button', { name: 'Save' });
  readonly clinicalNotesField = () => this.page.getByRole('textbox', { name: /clinical notes/i });
  readonly wardAdmissionNoteField = () => this.page.getByRole('textbox', { name: /write your notes/i });
  readonly cancelAdmissionRequestHeading = () => this.page.getByText('Cancel admission request');
  readonly transferButton = () => this.page.getByRole('button', { name: 'Transfers' });
  readonly swapButton = () => this.page.getByRole('tab', { name: 'Bed swap' });

  static async open(page: Page) {
    return test.step('When I navigate to the ward page', async () => {
      const wardPage = new WardPage(page);
      wardPage.page.goto('/openmrs/spa/home/ward');
      return wardPage;
    });
  }

  async clickPatientCard(patientName: string) {
    // Wait for patient to be loaded - use first() to avoid strict mode violation
    await this.page
      .locator(`[class*="wardPatientCard"]:has-text("${patientName}")`)
      .first()
      .waitFor({ state: 'visible' });

    // Click the patient card directly
    await this.page.locator(`[class*="wardPatientCard"]:has-text("${patientName}")`).first().click({ force: true });
  }

  async clickManageAdmissionRequests() {
    await test.step('When I click the "Manage" button to view admission requests', async () => {
      await this.manageAdmissionRequestsButton().click();
    });
  }

  async waitForAdmissionRequest(patientName: string) {
    // Wait for the admission request to appear in the list
    // Note: API polling in test setup ensures data is available, so shorter timeout is sufficient
    await this.page
      .locator('[class*="admissionRequestCard"]')
      .filter({ hasText: patientName })
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });
  }

  async clickPatientNotesButton() {
    await this.page.getByRole('button', { name: 'Patient Note' }).click();
  }

  async clickCancelAdmissionButton(patientName: string) {
    return test.step(`When I click the "Cancel" button for patient ${patientName}`, async () => {
      return this.page
        .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
        .filter({ hasText: 'Cancel' })
        .first()
        .click();
    });
  }

  async clickAdmitElsewhereButton(patientName: string) {
    return test.step(`When I click the "Admit elsewhere" button for patient ${patientName}`, async () => {
      return this.page
        .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
        .filter({ hasText: 'Admit elsewhere' })
        .first()
        .click();
    });
  }

  async clickTransferElsewhereButton(patientName: string) {
    return test.step(`When I click the "Transfer elsewhere" button for patient ${patientName}`, async () => {
      return this.page
        .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
        .filter({ hasText: 'Transfer elsewhere' })
        .first()
        .click();
    });
  }

  async fillWardAdmissionNote(note: string) {
    await this.wardAdmissionNoteField().fill(note);
  }

  async clickSaveButton() {
    await this.saveButton().click();
  }

  async expectAdmissionRequestCancelled() {
    await this.page.getByText(/admission request cancelled/i).waitFor({ state: 'visible' });
  }

  async waitForPatientInWardView(patientName: string) {
    await this.page
      .locator(`[class*="wardPatientCard"]:has-text("${patientName}")`)
      .first()
      .waitFor({ state: 'visible' });
  }

  async clickAdmitPatientButton(patientName: string) {
    return test.step(`When I click the "Admit patient" button for patient ${patientName}`, async () => {
      return this.page
        .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
        .filter({ hasText: 'Admit patient' })
        .first()
        .click();
    });
  }

  async clickTransferPatientButton(patientName: string) {
    return test.step(`When I click the "Transfer patient" button for patient ${patientName}`, async () => {
      return this.page
        .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
        .filter({ hasText: 'Transfer patient' })
        .first()
        .click();
    });
  }

  async selectBed(bedNumber: string) {
    return test.step(`When I select bed ${bedNumber} for the patient admission`, async () => {
      await this.page.getByText(new RegExp(`^${bedNumber} · `)).click();
    });
  }

  async clickAdmitButton() {
    return test.step('When I click the "Admit" button to confirm patient admission', async () => {
      await this.page.getByRole('button', { name: 'Admit', exact: true }).click();
    });
  }

  async expectAdmissionSuccessNotification(patientName: string, bedNumber: string) {
    return test.step(`Then I should see a success message confirming ${patientName} was admitted to bed ${bedNumber}`, async () => {
      await expect(this.page.getByText('Patient admitted successfully')).toBeVisible();
      await expect(
        this.page.getByText(
          new RegExp(`${patientName}\\s+has been successfully admitted and assigned to bed ${bedNumber}`, 'i'),
        ),
      ).toBeVisible();
    });
  }

  async expectPatientAdmittedToWard(patient: Patient) {
    return test.step(`Then I should see the patient ${getPatientName(patient)} admitted to the ward`, async () => {
      await expect(this.page.getByText(getPatientIdentifierStr(patient))).toBeVisible();
    });
  }
}
