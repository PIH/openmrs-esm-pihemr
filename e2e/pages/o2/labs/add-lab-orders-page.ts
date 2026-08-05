import { expect, type Page } from '@playwright/test';
import { type Patient } from '@openmrs/esm-framework';
import { step, test } from '../../../core';

/**
 * The "Add Lab orders" page for a single patient (pihapps labOrder.page).
 *
 * Every test category is rendered into the DOM at once and only the active one is shown, so the
 * lab test buttons are looked up inside the visible category pane. The first category
 * (Haematology) activates itself on load.
 */
export class O2AddLabOrdersPage {
  private constructor(readonly page: Page) {}

  readonly saveButton = () => this.page.locator('#draft-save-button');
  readonly discardAllButton = () => this.page.locator('#draft-discard-all');
  readonly returnButton = () => this.page.locator('#cancel-button');
  readonly draftOrderCount = () => this.page.locator('#num-draft-orders');
  readonly draftOrders = () => this.page.locator('#draft-list-container li.draft-list');

  categoryTab(categoryName: string) {
    return this.page.locator('a.category-link').filter({ hasText: categoryName });
  }

  /**
   * Panel buttons wrap a hover tooltip listing their member tests, so the button's text is more
   * than just its label -- hasText (substring) handles that, where an exact-name role lookup
   * would not. Scoped to the visible pane so that a name reused in another category can't match.
   */
  labTestButton(labTestName: string) {
    return this.page.locator('.lab-selection-form:visible button.lab-tests-btn').filter({ hasText: labTestName });
  }

  draftOrder(labTestName: string) {
    return this.draftOrders().filter({ hasText: labTestName });
  }

  @step
  static async open(page: Page, patient: Patient, returnUrl?: string) {
    return test.step(`When I navigate to the add lab orders page for patient ${patient.uuid}`, async () => {
      const addLabOrdersPage = new O2AddLabOrdersPage(page);
      const returnUrlParam = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
      await page.goto(
        `${process.env.E2E_BASE_URL}/pihapps/labs/labOrder.page?patient=${patient.uuid}${returnUrlParam}`,
      );
      await expect(addLabOrdersPage.saveButton()).toBeVisible();
      return addLabOrdersPage;
    });
  }

  /** For when we already navigated here (e.g. by selecting a patient from the search page). */
  @step
  static async at(page: Page) {
    return test.step('When I land on the add lab orders page', async () => {
      const addLabOrdersPage = new O2AddLabOrdersPage(page);
      await expect(addLabOrdersPage.saveButton()).toBeVisible();
      return addLabOrdersPage;
    });
  }

  @step
  async selectCategory(categoryName: string) {
    return test.step(`When I select the "${categoryName}" lab category`, async () => {
      await this.categoryTab(categoryName).click();
      await expect(this.categoryTab(categoryName)).toHaveClass(/active-category/);
    });
  }

  @step
  async selectLabTest(labTestName: string) {
    return test.step(`When I select the "${labTestName}" lab test`, async () => {
      await this.labTestButton(labTestName).click();
      await expect(this.draftOrder(labTestName)).toBeVisible();
    });
  }

  /**
   * Saves the drafted orders. On success the page immediately redirects to its returnUrl, which
   * tears down the "Order Successfully Created" toast before it can reliably be asserted on -- so
   * leaving this page is what we wait for instead.
   */
  @step
  async save() {
    return test.step('When I save the lab orders', async () => {
      await this.saveButton().click();
      await this.page.waitForURL((url) => !url.pathname.endsWith('labOrder.page'));
    });
  }

  @step
  async expectDraftOrderCount(count: number) {
    return test.step(`Then I should see ${count} draft order(s)`, async () => {
      await expect(this.draftOrderCount()).toHaveText(String(count));
      await expect(this.draftOrders()).toHaveCount(count);
    });
  }

  @step
  async expectOrdersSaved() {
    return test.step('Then the orders should have been saved', async () => {
      await expect(this.page).not.toHaveURL(/labOrder\.page/);
      await expect(this.saveButton()).toHaveCount(0);
    });
  }
}
