import { expect, type Page } from '@playwright/test';
import { type Patient } from '@openmrs/esm-framework';
import { step, test } from '../../../core';
import { type LabOrderStatus } from './lab-orders-page';

/**
 * A single patient's lab orders (pihapps labOrders.page).
 *
 * Note the page's own post-cancel redirect is broken -- it appends a stray ">" to the URL -- so
 * after cancelling an order, assert on the success message and then re-open the page (or the lab
 * orders worklist) rather than trusting wherever the redirect lands.
 */
export class O2PatientLabOrdersPage {
  private constructor(readonly page: Page) {}

  readonly orderStatusFilter = () => this.page.locator('#orderFulfillmentStatus-filter');
  readonly labTestFilter = () => this.page.locator('#testConcept-filter');
  readonly ordersTable = () => this.page.locator('#orders-table');
  readonly addLabOrdersButton = () => this.page.getByRole('button', { name: 'Add Lab orders' });

  // Discontinue confirmation dialog
  readonly discontinueDialog = () => this.page.locator('#discontinue-order-dialog');
  readonly discontinueReasonField = () => this.page.locator('#discontinue-reason-field');
  readonly discontinueConfirmButton = () => this.discontinueDialog().locator('button.confirm');
  readonly discontinueCancelButton = () => this.discontinueDialog().locator('button.cancel');

  /** Rows carry no attributes; the Lab Test column is the 3rd cell on this page. */
  orderRow(labTestName: string) {
    return this.ordersTable()
      .locator('tbody tr')
      .filter({ has: this.page.locator('td:nth-child(3)', { hasText: labTestName }) });
  }

  orderRowStatus(labTestName: string) {
    return this.orderRow(labTestName).locator('td:nth-child(5)');
  }

  /** The cancel "X" -- an icon-font glyph inside an anchor, with no accessible name. */
  cancelOrderButton(labTestName: string) {
    return this.orderRow(labTestName).locator('span.order-actions-btn a');
  }

  @step
  static async open(page: Page, patient: Patient) {
    return test.step(`When I navigate to the lab orders page for patient ${patient.uuid}`, async () => {
      const patientLabOrdersPage = new O2PatientLabOrdersPage(page);
      await page.goto(`${process.env.E2E_BASE_URL}/pihapps/labs/labOrders.page?patient=${patient.uuid}`);
      await patientLabOrdersPage.waitForOrdersTable();
      return patientLabOrdersPage;
    });
  }

  private async waitForOrdersTable() {
    await expect(this.ordersTable().locator('tbody tr')).not.toHaveCount(0);
    await expect(this.ordersTable().locator('tbody i.icon-spinner')).toHaveCount(0);
  }

  @step
  async filterByOrderStatus(status: LabOrderStatus) {
    return test.step(`When I filter by order status "${status}"`, async () => {
      // Options are appended by JS after load, so wait for them before selecting.
      await expect(this.orderStatusFilter().locator('option')).not.toHaveCount(0);
      await this.orderStatusFilter().selectOption({ label: status });
      await this.waitForOrdersTable();
    });
  }

  @step
  async filterByLabTest(labTestName: string) {
    return test.step(`When I filter by lab test "${labTestName}"`, async () => {
      // A 2nd option means the config-driven optgroups loaded; not.toHaveCount(1) would also pass
      // with zero options, which is the very case this guards against.
      await expect(this.labTestFilter().locator('option').nth(1)).toBeAttached();
      await this.labTestFilter().selectOption({ label: labTestName });
      await this.waitForOrdersTable();
    });
  }

  /**
   * Clicks the "X" for an order and confirms the discontinue dialog.
   *
   * The page's own success handler shows a toast and then redirects to a malformed URL (it appends
   * a stray ">" to the patient id), so neither the toast nor the resulting page is dependable.
   * We wait on the discontinue request itself, then callers should navigate somewhere real.
   */
  @step
  async cancelOrder(labTestName: string, reason = 'Cancelled by E2E test') {
    return test.step(`When I cancel the "${labTestName}" order`, async () => {
      await this.cancelOrderButton(labTestName).click();
      await expect(this.discontinueDialog()).toBeVisible();
      await this.discontinueReasonField().fill(reason);

      const discontinueResponse = this.page.waitForResponse(
        (response) => response.url().includes('/ws/rest/v1/encounter') && response.request().method() === 'POST',
      );
      await this.discontinueConfirmButton().click();
      expect((await discontinueResponse).ok()).toBeTruthy();
    });
  }

  @step
  async expectOrderStatus(labTestName: string, status: LabOrderStatus) {
    return test.step(`Then "${labTestName}" should have status "${status}"`, async () => {
      await expect(this.orderRowStatus(labTestName)).toContainText(status);
    });
  }

  @step
  async expectNoCancelActionFor(labTestName: string) {
    return test.step(`Then "${labTestName}" should no longer offer a cancel action`, async () => {
      await expect(this.cancelOrderButton(labTestName)).toHaveCount(0);
    });
  }
}
