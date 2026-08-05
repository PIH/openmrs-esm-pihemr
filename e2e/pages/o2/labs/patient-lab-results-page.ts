import { expect, type Page } from '@playwright/test';
import { type Patient } from '@openmrs/esm-framework';
import { step, test } from '../../../core';

/** A single patient's lab results (pihapps patientLabResults.page). */
export class O2PatientLabResultsPage {
  private constructor(readonly page: Page) {}

  readonly resultsSection = () => this.page.locator('#patient-lab-results-section');
  readonly resultsTable = () => this.page.locator('#results-table');
  readonly categoryFilter = () => this.page.locator('#category-filter');
  readonly panelFilter = () => this.page.locator('#panel-filter');
  readonly labTestFilter = () => this.page.locator('#testConcept-filter');
  readonly groupByDateCheckbox = () => this.page.locator('#groupByDate-filter');
  readonly clearFiltersLink = () => this.page.locator('#clear-all-filters');
  readonly returnButton = () => this.page.locator('#cancel-button');

  resultRow(labTestName: string) {
    return this.resultsTable().locator('tbody tr').filter({ hasText: labTestName });
  }

  @step
  static async open(page: Page, patient: Patient) {
    return test.step(`When I navigate to the lab results page for patient ${patient.uuid}`, async () => {
      const patientLabResultsPage = new O2PatientLabResultsPage(page);
      await page.goto(`${process.env.E2E_BASE_URL}/pihapps/labs/patientLabResults.page?patient=${patient.uuid}`);
      await expect(patientLabResultsPage.resultsSection()).toBeVisible();
      // Filter options are only populated once the config request resolves. Asserting a 2nd option
      // is attached means "more than just the blank one" -- unlike not.toHaveCount(1), which would
      // also be satisfied by zero options, i.e. by the config never having loaded.
      await expect(patientLabResultsPage.categoryFilter().locator('option').nth(1)).toBeAttached();
      return patientLabResultsPage;
    });
  }

  @step
  async expectResultRow(labTestName: string) {
    return test.step(`Then I should see a result row for "${labTestName}"`, async () => {
      await expect(this.resultRow(labTestName)).toBeVisible();
    });
  }
}
