import { expect, type Page } from '@playwright/test';
import { step, test } from '../core';

export class BedManagementPage {
  private constructor(readonly page: Page) {}

  readonly firstAddBedButton = () => this.page.locator('.bed-layout .block.add-block').first();
  readonly bedNumberField = () => this.page.locator('#bed-number-field');
  readonly saveButton = () => this.page.getByRole('button', { name: 'Save', exact: true });

  locationBlock(locationName: string) {
    return this.page.locator('.location.block').filter({ hasText: locationName });
  }

  bedBlock(bedNumber: string) {
    return this.page.locator('.existing-bed').filter({ hasText: bedNumber });
  }

  deleteBedButton(bedNumber: string) {
    return this.bedBlock(bedNumber).locator('a[title="delete"]');
  }

  @step
  static async open(page: Page) {
    return test.step('When I navigate to the bed management admission locations page', async () => {
      const bedManagementPage = new BedManagementPage(page);
      await page.goto('/openmrs/owa/bedmanagement/admissionLocations.html');
      return bedManagementPage;
    });
  }

  @step
  async selectLocation(locationName: string) {
    return test.step(`When I select the "${locationName}" location`, async () => {
      await this.locationBlock(locationName).click();
    });
  }

  /**
   * Opens the first "Add Bed" slot and saves it with the given bed number.
   * Returns the bed number actually saved (the field truncates input beyond its maxlength).
   */
  @step
  async addBed(bedNumber: string) {
    return test.step(`When I add a new bed with number "${bedNumber}"`, async () => {
      await this.firstAddBedButton().click();
      await this.bedNumberField().fill(bedNumber);
      const savedBedNumber = await this.bedNumberField().inputValue();
      await this.saveButton().click();
      return savedBedNumber;
    });
  }

  @step
  async expectBedCreated(bedNumber: string) {
    return test.step(`Then I should see bed "${bedNumber}" displayed`, async () => {
      await expect(this.bedBlock(bedNumber)).toBeVisible();
    });
  }

  /**
   * Hovers over the bed to reveal its delete button (hidden until hover), clicks it,
   * and accepts the native JS confirm dialog that follows.
   */
  @step
  async deleteBed(bedNumber: string) {
    return test.step(`When I delete bed "${bedNumber}"`, async () => {
      this.page.once('dialog', (dialog) => dialog.accept());
      await this.bedBlock(bedNumber).hover();
      await this.deleteBedButton(bedNumber).click();
    });
  }

  @step
  async expectDeletedSuccessfullyNotification() {
    return test.step('Then I should see a "Deleted successfully" notification', async () => {
      await expect(this.page.getByText('Deleted successfully')).toBeVisible();
    });
  }

  @step
  async expectBedDeleted(bedNumber: string) {
    return test.step(`Then bed "${bedNumber}" should no longer be displayed`, async () => {
      await expect(this.bedBlock(bedNumber)).not.toBeVisible();
    });
  }
}
