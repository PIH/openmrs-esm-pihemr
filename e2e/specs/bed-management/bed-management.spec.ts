import { changeLocation } from '../../commands';
import { KGHLocationsUuids, test } from '../../core';
import { BedManagementPage, WardPage } from '../../pages';

test.describe('Bed Management', () => {
  test.beforeEach(async ({ api }) => {
    await changeLocation(api, KGHLocationsUuids['MCOE Triage']);
  });

  test('Add a bed via bed mangement, then remove it', async ({ page }) => {
    const randomFourDigitNumber = Math.floor(1000 + Math.random() * 9000);
    const bedNumber = `TestBed${randomFourDigitNumber}`;

    let bedManagementPage = await BedManagementPage.open(page);
    await bedManagementPage.selectLocation('MCOE Triage');

    const savedBedNumber = await bedManagementPage.addBed(bedNumber);

    await bedManagementPage.expectBedCreated(savedBedNumber);

    // go to the ward page and confirm the bed is displayed there as well
    let wardPage = await WardPage.open(page);
    await wardPage.expectBedNumber(savedBedNumber);

    bedManagementPage = await BedManagementPage.open(page);
    await bedManagementPage.selectLocation('MCOE Triage');

    await bedManagementPage.deleteBed(savedBedNumber);
    await bedManagementPage.expectDeletedSuccessfullyNotification();
    await bedManagementPage.expectBedDeleted(savedBedNumber);

    // go to the ward page and confirm the bed is no longer displayed there as well
    wardPage = await WardPage.open(page);
    await wardPage.expectBedNumberNotVisible(savedBedNumber);
  });
});
