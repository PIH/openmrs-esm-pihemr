import { expect } from '@playwright/test';
import { changeLocation, getPatientIdentifierStr, getPatientName } from '../../commands';
import { KGHLocationsUuids, test } from '../../core';
import { WardPage } from '../../pages';
import { O2VisitPage } from '../../pages/o2/visit-page';

test.describe('Ward App', () => {
  test.beforeEach(async ({ api }) => {
    await changeLocation(api, KGHLocationsUuids['MCOE Triage']);
  });

  test('Admit a patient to a ward from the admission requests list, then transfer to another location', async ({
    page,
    api,
    adultWoman,
    adultWomanVisit,
  }) => {
    const patientName = getPatientName(adultWoman);

    const o2VisitPage: O2VisitPage = await O2VisitPage.open(page, adultWoman, adultWomanVisit);
    const mchTriageFormPage = await o2VisitPage.openMCHTriageForm();
    await mchTriageFormPage.fillForm({ disposition: { admitToWard: 'Labour and Delivery' } });
    await mchTriageFormPage.save();

    await test.step('Then I should see success toast', async () => {
      await expect(page.getByText('Entered MCOE Triage for ' + adultWoman.person.display)).toBeVisible();
    });

    await changeLocation(api, KGHLocationsUuids['Labour and Delivery']);
    const wardPage = await WardPage.open(page);
    await wardPage.clickManageAdmissionRequests();

    await wardPage.clickAdmitPatientButton(patientName);

    await test.step('When I select bed 1 and click the "Admit" button', async () => {
      await page.getByText(/^1 · /).click();
      await page.getByRole('button', { name: 'Admit', exact: true }).click();
    });

    await wardPage.expectAdmissionSuccessNotification(patientName, '1');
    await wardPage.expectPatientAdmittedToWard(adultWoman);

    await wardPage.clickPatientCard(patientName);
    await page.getByRole('button', { name: 'Transfers' }).click();
    await page.locator('#omrs-workspaces-container').getByText('Antenatal Ward').click();
    await page.getByRole('button', { name: 'Save' }).click();

    await test.step('Then I should see the transfer request submitted successfully', async () => {
      await expect(page.getByText('Patient transfer request created')).toBeVisible();
    });

    await changeLocation(api, KGHLocationsUuids['Antenatal Ward']);
    const antenatalWardPage = await WardPage.open(page);
    await antenatalWardPage.clickManageAdmissionRequests();
    await antenatalWardPage.clickAdmitPatientButton(patientName);

    await antenatalWardPage.selectBed('1');
    await antenatalWardPage.clickAdmitButton();
    await antenatalWardPage.expectAdmissionSuccessNotification(patientName, '1');

    await wardPage.expectPatientAdmittedToWard(adultWoman);
  });

  test('Cancel a patient admission request from the ward admission requests list', async ({
    page,
    api,
    adultWoman,
    adultWomanVisit,
  }) => {
    const patientName = getPatientName(adultWoman);

    const o2VisitPage: O2VisitPage = await O2VisitPage.open(page, adultWoman, adultWomanVisit);
    const mchTriageFormPage = await o2VisitPage.openMCHTriageForm();
    await mchTriageFormPage.fillForm({ disposition: { admitToWard: 'Labour and Delivery' } });
    await mchTriageFormPage.save();

    await test.step('Then I should see success toast', async () => {
      await expect(page.getByText('Entered MCOE Triage for ' + adultWoman.person.display)).toBeVisible();
    });

    await changeLocation(api, KGHLocationsUuids['Labour and Delivery']);
    const wardPage = await WardPage.open(page);
    await wardPage.clickManageAdmissionRequests();

    await wardPage.clickCancelAdmissionButton(patientName);

    await test.step('When I fill the admission cancellation note and click the "Save" button', async () => {
      await wardPage.clinicalNotesField().fill('Patient does not require admission at this time');
      await wardPage.clickSaveButton();
    });

    await test.step('Then I should see success toast for cancelled admission request', async () => {
      await expect(page.getByText('admission request cancelled')).toBeVisible();
    });
  });

  test('Have a patient admit elsewhere from the ward admission requests list', async ({
    page,
    api,
    adultWoman,
    adultWomanVisit,
  }) => {
    const patientName = getPatientName(adultWoman);
    const patientIdentifier = getPatientIdentifierStr(adultWoman);

    const o2VisitPage: O2VisitPage = await O2VisitPage.open(page, adultWoman, adultWomanVisit);
    const mchTriageFormPage = await o2VisitPage.openMCHTriageForm();
    await mchTriageFormPage.fillForm({ disposition: { admitToWard: 'Labour and Delivery' } });
    await mchTriageFormPage.save();

    await test.step('Then I should see success toast', async () => {
      await expect(page.getByText('Entered MCOE Triage for ' + adultWoman.person.display)).toBeVisible();
    });

    await changeLocation(api, KGHLocationsUuids['Labour and Delivery']);
    const labourAndDeliveryWardPage = await WardPage.open(page);
    await labourAndDeliveryWardPage.clickManageAdmissionRequests();

    await labourAndDeliveryWardPage.clickAdmitElsewhereButton(patientName);

    await page.locator('#omrs-workspaces-container').getByText('Antenatal Ward').click();
    await page.getByRole('button', { name: 'Save' }).click();

    await test.step('Then I should see the admission request submitted successfully', async () => {
      await expect(page.getByText('Patient admission request created')).toBeVisible();
    });

    await changeLocation(api, KGHLocationsUuids['Antenatal Ward']);
    const antenatalWardPage = await WardPage.open(page);
    await antenatalWardPage.clickManageAdmissionRequests();
    await antenatalWardPage.clickAdmitPatientButton(patientName);

    await antenatalWardPage.selectBed('1');
    await antenatalWardPage.clickAdmitButton();
    await antenatalWardPage.expectAdmissionSuccessNotification(patientName, '1');

    await antenatalWardPage.expectPatientAdmittedToWard(adultWoman);
  });

  test('Search for a patient to admit to ward', async ({ page, api, adultWoman, adultWomanVisit }) => {
    const patientName = getPatientName(adultWoman);
    const patientIdentifier = getPatientIdentifierStr(adultWoman);

    await changeLocation(api, KGHLocationsUuids['Labour and Delivery']);
    const wardPage = await WardPage.open(page);
    await wardPage.clickManageAdmissionRequests();

    await page.getByRole('button', { name: 'Add patient to ward' }).click();
    await page.getByTestId('patientSearchBar').click();
    await page.getByTestId('patientSearchBar').fill(patientIdentifier);
    await page.getByRole('button', { name: patientName }).click();
    await page.locator('#create-admission-encounter-workspace').getByRole('button', { name: 'admit patient' }).click();

    await wardPage.selectBed('1');
    await wardPage.clickAdmitButton();
    await wardPage.expectAdmissionSuccessNotification(patientName, '1');

    await wardPage.expectPatientAdmittedToWard(adultWoman);
  });
});
