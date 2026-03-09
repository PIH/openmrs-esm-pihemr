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
    await mchTriageFormPage.expectSuccessToast(patientName);

    await changeLocation(api, KGHLocationsUuids['Labour and Delivery']);
    const wardPage = await WardPage.open(page);
    await wardPage.manageAdmissionRequests().click();

    await wardPage.admitPatientButton(patientName).click();

    const bedNumber = '1';
    await wardPage.selectBed(bedNumber);
    await wardPage.clickAdmitButton();

    await wardPage.expectAdmissionSuccessNotification(patientName, bedNumber);
    await wardPage.expectPatientAdmittedToWard(adultWoman);

    await wardPage.patientCard(patientName).click();
    await wardPage.transfersButton().click();
    await wardPage.selectLocation('Antenatal Ward');
    await wardPage.clickSaveButton();
    await wardPage.expectTransferRequestSubmitted();

    await changeLocation(api, KGHLocationsUuids['Antenatal Ward']);
    const antenatalWardPage = await WardPage.open(page);
    await antenatalWardPage.manageAdmissionRequests().click();
    await antenatalWardPage.transferPatientButton(patientName).click();

    await antenatalWardPage.selectBed(bedNumber);
    await antenatalWardPage.clickAdmitButton();
    await antenatalWardPage.expectAdmissionSuccessNotification(patientName, bedNumber);

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
    await mchTriageFormPage.expectSuccessToast(patientName);

    await changeLocation(api, KGHLocationsUuids['Labour and Delivery']);
    const wardPage = await WardPage.open(page);
    await wardPage.manageAdmissionRequests().click();

    await wardPage.cancelAdmissionButton(patientName).click();

    await wardPage.clinicalNotesField().fill('Patient does not require admission at this time');
    await wardPage.clickSaveButton();

    await wardPage.expectAdmissionRequestCancelled();
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
    await mchTriageFormPage.expectSuccessToast(patientName);

    await changeLocation(api, KGHLocationsUuids['Labour and Delivery']);
    const labourAndDeliveryWardPage = await WardPage.open(page);
    await labourAndDeliveryWardPage.manageAdmissionRequests().click();

    await labourAndDeliveryWardPage.admitElsewhereButton(patientName).click();

    await labourAndDeliveryWardPage.selectLocation('Antenatal Ward');
    await labourAndDeliveryWardPage.clickSaveButton();
    await labourAndDeliveryWardPage.expectTransferRequestSubmitted();

    await changeLocation(api, KGHLocationsUuids['Antenatal Ward']);
    const antenatalWardPage = await WardPage.open(page);
    await antenatalWardPage.manageAdmissionRequests().click();
    await antenatalWardPage.transferPatientButton(patientName).click();

    const bedNumber = '1';
    await antenatalWardPage.selectBed(bedNumber);
    await antenatalWardPage.clickAdmitButton();
    await antenatalWardPage.expectAdmissionSuccessNotification(patientName, bedNumber);

    await antenatalWardPage.expectPatientAdmittedToWard(adultWoman);
  });

  test('Search for a patient to admit to ward', async ({ page, api, adultWoman, adultWomanVisit }) => {
    const patientName = getPatientName(adultWoman);
    const patientIdentifier = getPatientIdentifierStr(adultWoman);

    await changeLocation(api, KGHLocationsUuids['Labour and Delivery']);
    const wardPage = await WardPage.open(page);
    await wardPage.manageAdmissionRequests().click();

    await wardPage.addPatientToWardButton().click();
    await wardPage.patientSearchBar().click();
    await wardPage.patientSearchBar().fill(patientIdentifier);
    await wardPage.patientSearchResult(patientName).click();
    // TODO: update this after the html id is checked in for the ward app
    await page.locator('#create-admission-encounter-workspace').getByRole('button', { name: 'admit patient' }).click();

    const bedNumber = '1';
    await wardPage.selectBed(bedNumber);
    await wardPage.clickAdmitButton();
    await wardPage.expectAdmissionSuccessNotification(patientName, bedNumber);

    await wardPage.expectPatientAdmittedToWard(adultWoman);
  });
});
