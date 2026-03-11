import { expect, type Page } from '@playwright/test';
import { step, test } from '../core';
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
  readonly transfersButton = () => this.page.getByRole('button', { name: 'Transfers' });
  readonly swapButton = () => this.page.getByRole('tab', { name: 'Bed swap' });
  readonly addPatientToWardButton = () => this.page.getByRole('button', { name: 'Add patient to ward' });
  readonly patientSearchBar = () => this.page.getByTestId('patientSearchBar');

  patientCard(patientName: string) {
    return this.page.locator(`[class*="wardPatientCard"]:has-text("${patientName}")`).first();
  }

  patientSearchResult(patientName: string) {
    return this.page.getByRole('button', { name: patientName });
  }

  manageAdmissionRequests() {
    return this.manageAdmissionRequestsButton();
  }

  patientNotesButton() {
    return this.page.getByRole('button', { name: 'Patient Note' });
  }

  cancelAdmissionButton(patientName: string) {
    return this.page
      .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
      .filter({ hasText: 'Cancel' })
      .first();
  }

  admitElsewhereButton(patientName: string) {
    return this.page
      .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
      .filter({ hasText: 'Admit elsewhere' })
      .first();
  }

  transferElsewhereButton(patientName: string) {
    return this.page
      .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
      .filter({ hasText: 'Transfer elsewhere' })
      .first();
  }

  admitPatientButton(patientName: string) {
    return this.page
      .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
      .filter({ hasText: 'Admit patient' })
      .first();
  }

  transferPatientButton(patientName: string) {
    return this.page
      .locator(`[class*="admissionRequestCard"]:has-text("${patientName}") button`)
      .filter({ hasText: 'Transfer patient' })
      .first();
  }

  @step
  static async open(page: Page) {
    return test.step('When I navigate to the ward page', async () => {
      const wardPage = new WardPage(page);
      wardPage.page.goto('/openmrs/spa/home/ward');
      return wardPage;
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

  async fillWardAdmissionNote(note: string) {
    await this.wardAdmissionNoteField().fill(note);
  }

  async waitForPatientInWardView(patientName: string) {
    await this.page
      .locator(`[class*="wardPatientCard"]:has-text("${patientName}")`)
      .first()
      .waitFor({ state: 'visible' });
  }

  @step
  async selectBed(bedNumber: string) {
    return test.step(`When I select bed ${bedNumber} for the patient admission`, async () => {
      if (await this.page.getByRole('combobox', { name: 'Choose an option' }).isVisible()) {
        await this.page.getByRole('combobox', { name: 'Choose an option' }).click();
      }
      await this.page.getByText(new RegExp(`^${bedNumber} · `)).click();
    });
  }

  @step
  async selectLocation(locationName: string) {
    await this.page.locator('#omrs-workspaces-container').getByText(locationName).click();
  }

  @step
  async clickSaveButton() {
    return test.step('When I click the "Save" button', async () => {
      await this.page.getByRole('button', { name: 'Save', exact: true }).click();
    });
  }

  @step
  async clickAdmitButton() {
    return test.step('When I click the "Admit" button to confirm patient admission', async () => {
      await this.page.getByRole('button', { name: 'Admit', exact: true }).click();
    });
  }

  @step
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

  @step
  async expectPatientAdmittedToWard(patient: Patient) {
    return test.step(`Then I should see the patient ${getPatientName(patient)} admitted to the ward`, async () => {
      await expect(this.page.getByText(getPatientIdentifierStr(patient))).toBeVisible();
    });
  }

  @step
  async expectTransferRequestSubmitted() {
    return await test.step('Then I should see the transfer request submitted successfully', async () => {
      await expect(this.page.getByText('Patient transfer request created')).toBeVisible();
    });
  }

  @step
  async expectAdmissionRequestCancelled() {
    return await test.step('Then I should see success toast for cancelled admission request', async () => {
      await expect(this.page.getByText('admission request cancelled')).toBeVisible();
    });
  }
}
