import { expect, type Page } from '@playwright/test';
import { type Patient } from '@openmrs/esm-framework';
import { step, test } from '../../core';

/**
 * The legacy O2 clinician-facing patient chart.
 *
 * The "General Actions" links are app-framework extensions, and the anchor's id is the extension
 * id verbatim -- hence the attribute selectors rather than getByRole.
 */
export class O2PatientChartPage {
  private constructor(readonly page: Page) {}

  readonly labOrdersLink = () => this.page.locator('a[id="orderentryowa.orderLabs"]');
  readonly viewLabResultsLink = () => this.page.locator('a[id="labworkflowowa.viewLabs"]');

  @step
  static async open(page: Page, patient: Patient) {
    return test.step(`When I navigate to the patient chart for patient ${patient.uuid}`, async () => {
      const patientChartPage = new O2PatientChartPage(page);
      await page.goto(`${process.env.E2E_BASE_URL}/coreapps/clinicianfacing/patient.page?patientId=${patient.uuid}`);
      return patientChartPage;
    });
  }

  @step
  async openLabOrders() {
    return test.step('When I click the "Lab Orders" link', async () => {
      await this.labOrdersLink().click();
      // The href picks up a doubled slash and an appended returnUrl, so match loosely.
      await expect(this.page).toHaveURL(/labOrders\.page/);
    });
  }

  @step
  async openLabResults() {
    return test.step('When I click the "View Lab Results" link', async () => {
      await this.viewLabResultsLink().click();
      // Routes via pihcore/router/labRouter.page, which redirects when pihcore.usePihAppsLabs is on.
      await expect(this.page).toHaveURL(/patientLabResults\.page|labworkflow/);
    });
  }

  @step
  async expectLabLinksVisible() {
    return test.step('Then I should see the lab orders and lab results links', async () => {
      await expect(this.labOrdersLink()).toBeVisible();
      await expect(this.labOrdersLink()).toHaveText('Lab Orders');
      await expect(this.viewLabResultsLink()).toBeVisible();
      await expect(this.viewLabResultsLink()).toHaveText('View Lab Results');
    });
  }
}
