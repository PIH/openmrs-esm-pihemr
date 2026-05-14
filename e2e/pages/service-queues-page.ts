import { expect, type Page } from '@playwright/test';
import { step, test } from '../core';

export class ServiceQueuesPage {
  private constructor(readonly page: Page) {}

  // ── Header / toolbar ──────────────────────────────────────────────────────
  readonly addPatientToQueueButton = () => this.page.getByRole('button', { name: 'Add patient to queue' }).first();

  // ── Add-patient workspace ─────────────────────────────────────────────────
  readonly patientSearchBar = () => this.page.getByTestId('patientSearchBar');
  readonly searchButton = () => this.page.getByRole('button', { name: 'Search', exact: true });
  readonly discardButton = () => this.page.getByRole('button', { name: 'Discard', exact: true });
  // Submit inside the form — scoped to avoid matching the header "Add patient to queue" button
  readonly submitAddPatientButton = () =>
    this.page.locator('form').getByRole('button', { name: 'Add patient to queue' });

  patientSearchResult(patientIdentifier: string) {
    // Patient result cards render as role="banner" (i.e. <header>) in the search results panel
    return this.page.getByRole('banner').filter({ hasText: patientIdentifier });
  }

  // ── Queue table rows ───────────────────────────────────────────────────────
  waitingRow(patientName: string) {
    return this.page
      .locator('table[aria-label="Queue table"]')
      .filter({ hasText: 'Wait time' })
      .getByRole('row')
      .filter({ hasText: patientName });
  }

  inServiceRow(patientName: string) {
    return this.page
      .locator('table[aria-label="Queue table"]')
      .filter({ hasText: 'Time in service' })
      .getByRole('row')
      .filter({ hasText: patientName });
  }

  triageButton(patientName: string) {
    return this.waitingRow(patientName).getByRole('button', { name: 'Triage' });
  }

  overflowMenuButton(patientName: string) {
    return this.page
      .locator('table[aria-label="Queue table"] tr')
      .filter({ hasText: patientName })
      .first()
      .getByRole('button', { name: 'Options' });
  }

  overflowMenuItem(itemText: string) {
    return this.page.getByRole('menuitem', { name: itemText });
  }

  // ── Confirmation modal buttons ────────────────────────────────────────────
  readonly confirmRemoveButton = () => this.page.getByRole('button', { name: 'Remove' });
  readonly confirmDeleteButton = () => this.page.getByRole('button', { name: 'Delete queue entry' });
  readonly confirmUndoTransitionButton = () => this.page.getByRole('button', { name: 'Undo transition' });

  // ── Navigation ────────────────────────────────────────────────────────────
  @step
  static async open(page: Page) {
    return test.step('When I navigate to the service queues page', async () => {
      const serviceQueuesPage = new ServiceQueuesPage(page);
      await page.goto('/openmrs/spa/home/service-queues/queue-table-by-status/3113f164-68f0-11ee-ab8d-0242ac120002');
      await page.getByRole('button', { name: 'Add patient to queue' }).first().waitFor({ state: 'visible' });
      return serviceQueuesPage;
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  @step
  async addPatientToQueue(patientIdentifier: string) {
    return test.step(`When I add patient ${patientIdentifier} to the queue`, async () => {
      await this.addPatientToQueueButton().click();
      await this.patientSearchBar().fill(patientIdentifier);
      await this.searchButton().click();
      await this.patientSearchResult(patientIdentifier).waitFor({ state: 'visible' });
      await this.patientSearchResult(patientIdentifier).click();
      await this.page.locator('select#queueService').selectOption({ label: 'MCOE Triage' });
      await this.submitAddPatientButton().click();
    });
  }

  @step
  async triagePatient(patientName: string) {
    return test.step(`When I triage patient ${patientName}`, async () => {
      await this.triageButton(patientName).click();
      // Clicking Triage immediately transitions the patient to "In service"
      // and opens the triage form workspace as a side effect.
    });
  }

  @step
  async dismissWorkspace() {
    return test.step('When I dismiss the open workspace', async () => {
      await this.page.getByLabel('Close', { exact: true }).click();
      await this.page.getByRole('button', { name: 'Discard changes' }).click();
    });
  }

  @step
  async removePatientFromQueue(patientName: string) {
    return test.step(`When I remove patient ${patientName} from the queue`, async () => {
      await this.overflowMenuButton(patientName).click();
      await this.overflowMenuItem('Remove patient').click();
      await this.confirmRemoveButton().click();
    });
  }

  @step
  async deletePatientFromQueue(patientName: string) {
    return test.step(`When I delete patient ${patientName} from the queue`, async () => {
      await this.overflowMenuButton(patientName).click();
      await this.overflowMenuItem('Delete').click();
      await this.confirmDeleteButton().click();
    });
  }

  @step
  async undoQueueTransition(patientName: string) {
    return test.step(`When I undo the queue transition for patient ${patientName}`, async () => {
      await this.overflowMenuButton(patientName).click();
      await this.overflowMenuItem('Undo transition').click();
      await this.confirmUndoTransitionButton().click();
    });
  }

  // ── Assertions ────────────────────────────────────────────────────────────
  @step
  async expectPatientInWaitingQueue(patientName: string) {
    return test.step(`Then I should see ${patientName} added to the waiting queue`, async () => {
      await expect(this.waitingRow(patientName)).toBeVisible();
    });
  }

  @step
  async expectPatientInInServiceQueue(patientName: string) {
    return test.step(`Then I should see ${patientName} in the In service table`, async () => {
      await expect(this.inServiceRow(patientName)).toBeVisible();
    });
  }

  @step
  async expectPatientRemovedFromQueue(patientName: string) {
    return test.step(`Then I should see ${patientName} removed from the queue`, async () => {
      await expect(this.page.getByText('Patient removed')).toBeVisible();
      await expect(this.waitingRow(patientName)).not.toBeVisible();
    });
  }

  @step
  async expectPatientDeletedFromQueue(patientName: string) {
    return test.step(`Then I should see ${patientName} deleted from the queue`, async () => {
      await expect(this.page.getByText('Queue entry deleted successfully')).toBeVisible();
    });
  }

  @step
  async expectTransitionUndone(patientName: string) {
    return test.step(`Then I should see ${patientName} moved back to Waiting`, async () => {
      await expect(this.page.getByText('Undo transition success')).toBeVisible();
      await expect(this.waitingRow(patientName)).toBeVisible();
    });
  }

  @step
  async expectPatientNotInWaitingQueue(patientName: string) {
    return test.step(`Then I should not see ${patientName} in the waiting queue`, async () => {
      await expect(this.waitingRow(patientName)).not.toBeVisible();
    });
  }
}
