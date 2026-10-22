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

  // Specimen collection form, shown inline in place of the orders list
  readonly ordersListSection = () => this.page.locator('#view-orders-section');
  readonly specimenCollectionSection = () => this.page.locator('#edit-specimen-encounter-section');

  // Discontinue confirmation dialog
  readonly discontinueDialog = () => this.page.locator('#discontinue-order-dialog');
  readonly discontinueReasonField = () => this.page.locator('#discontinue-reason-field');
  readonly discontinueConfirmButton = () => this.discontinueDialog().locator('button.confirm');
  readonly discontinueCancelButton = () => this.discontinueDialog().locator('button.cancel');

  /**
   * Rows carry no attributes. At admission locations a leading selection checkbox column shifts every
   * other cell by one, so the Lab Test cell is found by its position from the end of the row (it is
   * the 4th last, before ordered-by, status and actions) rather than from the start.
   */
  orderRow(labTestName: string) {
    return this.ordersTable()
      .locator('tbody tr')
      .filter({ has: this.page.locator('td:nth-last-child(4)', { hasText: labTestName }) });
  }

  orderRowStatus(labTestName: string) {
    return this.orderRow(labTestName).locator('td:nth-last-child(2)');
  }

  /** The cancel "X" -- an icon-font glyph inside an anchor, with no accessible name. */
  cancelOrderButton(labTestName: string) {
    return this.orderRow(labTestName).locator('span.order-actions-btn a');
  }

  /** A bare <i> icon with no accessible name beyond its `title`; only rendered at admission locations. */
  collectSpecimenButton(labTestName: string) {
    return this.orderRow(labTestName).locator('i.collect-specimen-action');
  }

  /** Only rendered at admission locations, and only for orders that can still be collected. */
  selectOrderCheckbox(labTestName: string) {
    return this.orderRow(labTestName).locator('input.select-order-checkbox');
  }

  readonly selectedOrdersBar = () => this.page.locator('#selected-orders-bar');
  readonly selectedOrdersCount = () => this.page.locator('#selected-orders-count');
  readonly clearSelectedOrdersLink = () => this.page.locator('#clear-selected-orders');
  readonly collectSelectedOrdersButton = () => this.page.locator('#collect-selected-orders');

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

  @step
  async collectSpecimen(labTestName: string) {
    await test.step(`When I collect the specimen for "${labTestName}"`, async () => {
      await this.collectSpecimenButton(labTestName).click();
      await expect(this.specimenCollectionSection()).toBeVisible();
    });
    return new O2PatientLabOrdersPage.SpecimenCollectionForm(this);
  }

  @step
  async selectOrder(labTestName: string) {
    return test.step(`When I select the "${labTestName}" order`, async () => {
      await this.selectOrderCheckbox(labTestName).check();
    });
  }

  @step
  async expectSelectedOrderCount(count: number) {
    return test.step(`Then ${count} order(s) should be selected`, async () => {
      if (count === 0) {
        await expect(this.selectedOrdersBar()).toBeHidden();
      } else {
        await expect(this.selectedOrdersBar()).toBeVisible();
        await expect(this.selectedOrdersCount()).toHaveText(`${count}`);
      }
    });
  }

  @step
  async clearSelectedOrders() {
    return test.step('When I clear the selected orders', async () => {
      await this.clearSelectedOrdersLink().click();
    });
  }

  @step
  async expectOrderSelectable(labTestName: string, selectable: boolean) {
    return test.step(`Then "${labTestName}" should ${selectable ? '' : 'not '}offer a selection checkbox`, async () => {
      await expect(this.selectOrderCheckbox(labTestName)).toHaveCount(selectable ? 1 : 0);
    });
  }

  /** Collects a single specimen for every order currently selected in the table. */
  @step
  async collectSelectedOrders() {
    await test.step('When I collect a specimen for the selected orders', async () => {
      await this.collectSelectedOrdersButton().click();
      await expect(this.specimenCollectionSection()).toBeVisible();
    });
    return new O2PatientLabOrdersPage.SpecimenCollectionForm(this);
  }

  @step
  async expectCollectSpecimenAction(labTestName: string, visible: boolean) {
    return test.step(`Then "${labTestName}" should ${visible ? '' : 'not '}offer a collect specimen action`, async () => {
      if (visible) {
        await expect(this.collectSpecimenButton(labTestName)).toBeVisible();
      } else {
        await expect(this.collectSpecimenButton(labTestName)).toHaveCount(0);
      }
    });
  }

  @step
  async expectCollectSpecimenActionTitle(labTestName: string, title: 'Collect specimen' | 'Edit specimen collection') {
    return test.step(`Then the specimen action for "${labTestName}" should be titled "${title}"`, async () => {
      await expect(this.collectSpecimenButton(labTestName)).toHaveAttribute('title', title);
    });
  }

  @step
  async expectCancelAction(labTestName: string, visible: boolean) {
    return test.step(`Then "${labTestName}" should ${visible ? '' : 'not '}offer a cancel action`, async () => {
      if (visible) {
        await expect(this.cancelOrderButton(labTestName)).toBeVisible();
      } else {
        await expect(this.cancelOrderButton(labTestName)).toHaveCount(0);
      }
    });
  }

  /**
   * Opens the specimen collection edit for an already collected order while the fetch of its
   * encounter fails, and checks the page reports the error rather than leaving the user on a
   * spinner with the orders list hidden.
   */
  @step
  async expectSpecimenCollectionLoadFailure(labTestName: string) {
    return test.step(`Then loading the specimen collection for "${labTestName}" should fail gracefully`, async () => {
      await this.page.route('**/ws/rest/v1/encounterFulfillingOrders/**', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: '{"error":{"message":"E2E forced failure"}}',
        }),
      );
      try {
        await this.collectSpecimenButton(labTestName).click();
        await expect(this.page.getByText('Error loading specimen collection')).toBeVisible();
        await this.expectBackOnOrdersList();
      } finally {
        await this.page.unroute('**/ws/rest/v1/encounterFulfillingOrders/**');
      }
    });
  }

  @step
  async expectBackOnOrdersList() {
    return test.step('Then I should be back on the lab orders list', async () => {
      await expect(this.specimenCollectionSection()).toBeHidden();
      await expect(this.ordersListSection()).toBeVisible();
      await this.waitForOrdersTable();
    });
  }

  static SpecimenCollectionForm = class SpecimenCollectionForm {
    constructor(readonly labOrdersPage: O2PatientLabOrdersPage) {}

    private readonly page = () => this.labOrdersPage.page;
    private readonly section = () => this.page().locator('#specimen-encounter-section');

    readonly labIdField = () => this.page().locator('#specimen-encounter-section-lab-id-input');
    readonly saveButton = () => this.section().locator('button.confirm.action-button');
    readonly cancelButton = () => this.section().locator('button.cancel.action-button');

    /** Accessible name comes from aria-label, which is the lab test's display string. */
    orderCheckbox(labTestName: string) {
      return this.section().getByRole('checkbox', { name: labTestName });
    }

    @step
    async waitUntilReady() {
      await expect(this.section().locator('.form-content-section')).toBeVisible();
      await expect(this.labIdField()).toBeVisible();
    }

    @step
    async fillLabId(labId: string) {
      return test.step(`When I enter the lab ID "${labId}"`, async () => {
        await this.labIdField().fill(labId);
      });
    }

    @step
    async expectLabId(labId: string) {
      return test.step(`Then the lab ID should be "${labId}"`, async () => {
        await expect(this.labIdField()).toHaveValue(labId);
      });
    }

    @step
    async expectOrderSelected(labTestName: string, selected: boolean) {
      return test.step(`Then "${labTestName}" should be ${selected ? 'selected' : 'deselected'}`, async () => {
        if (selected) {
          await expect(this.orderCheckbox(labTestName)).toBeChecked();
        } else {
          await expect(this.orderCheckbox(labTestName)).not.toBeChecked();
        }
      });
    }

    @step
    async expectOrderNotListed(labTestName: string) {
      return test.step(`Then "${labTestName}" should not be part of the specimen collection`, async () => {
        await expect(this.orderCheckbox(labTestName)).toHaveCount(0);
      });
    }

    @step
    async cancel() {
      await test.step('When I cancel the specimen collection', async () => {
        await this.cancelButton().click();
        await expect(this.labOrdersPage.specimenCollectionSection()).toBeHidden();
      });
      return this.labOrdersPage;
    }

    @step
    async save() {
      await test.step('When I save the specimen collection', async () => {
        // Wait for the orders table refresh that follows a successful save, so later steps never
        // act on rows that are about to be re-rendered.
        const ordersRefreshed = this.page().waitForResponse(
          (response) =>
            response.url().includes('/ws/rest/v1/pihapps/labOrder') && response.request().method() === 'GET',
        );
        await this.saveButton().click();
        await expect(this.labOrdersPage.specimenCollectionSection()).toBeHidden();
        await ordersRefreshed;
      });
      return this.labOrdersPage;
    }
  };
}
