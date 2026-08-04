import { expect, type Page } from '@playwright/test';
import { type Patient } from '@openmrs/esm-framework';
import { getPatientIdentifierStr } from '../../../commands';
import { step, test } from '../../../core';
import { O2AddLabOrdersPage } from './add-lab-orders-page';

/**
 * The find-patient screen that fronts lab ordering
 * (coreapps findPatient.page for the pih.app.labs.ordering app).
 */
export class O2AddLabOrdersSearchPage {
  private constructor(readonly page: Page) {}

  readonly searchByIdOrNameField = () => this.page.getByPlaceholder('Search by ID or Name');
  readonly searchResultsTable = () => this.page.locator('#patient-search-results-table');

  searchResultRow(patientIdentifier: string) {
    return this.searchResultsTable().locator('tbody tr').filter({ hasText: patientIdentifier });
  }

  @step
  static async open(page: Page) {
    return test.step('When I navigate to the add lab orders patient search page', async () => {
      const searchPage = new O2AddLabOrdersSearchPage(page);
      await page.goto(`${process.env.E2E_BASE_URL}/coreapps/findpatient/findPatient.page?app=pih.app.labs.ordering`);
      await expect(searchPage.searchByIdOrNameField()).toBeVisible();
      return searchPage;
    });
  }

  /**
   * Searches by EMR ID and lands on the add lab orders page for that patient.
   *
   * Typing alone issues no request -- the widget searches on Enter. And on an exact identifier
   * match it does not populate the results table at all: it looks the patient up
   * (GET /ws/rest/v1/patient?identifier=...) and navigates straight to the app's afterSelectedUrl.
   * So there is no row to click in this flow; `searchResultRow` is there for a name search, which
   * does render rows.
   */
  @step
  async searchForPatientByIdentifier(patient: Patient) {
    const patientIdentifier = getPatientIdentifierStr(patient);
    await test.step(`When I search for patient "${patientIdentifier}" by EMR ID`, async () => {
      await this.searchByIdOrNameField().click();
      await this.searchByIdOrNameField().pressSequentially(patientIdentifier);
      await this.searchByIdOrNameField().press('Enter');
      await expect(this.page).toHaveURL(/labOrder\.page/);
    });
    return O2AddLabOrdersPage.at(this.page);
  }
}
