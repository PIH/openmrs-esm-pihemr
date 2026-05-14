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
    await wardPage.expectTransferRequestSubmitted(patientName);

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
    await labourAndDeliveryWardPage.expectTransferRequestSubmitted(patientName);

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
    await wardPage.admitPatientFromWorkspace().click();

    const bedNumber = '1';
    await wardPage.selectBed(bedNumber);
    await wardPage.clickAdmitButton();
    await wardPage.expectAdmissionSuccessNotification(patientName, bedNumber);

    await wardPage.expectPatientAdmittedToWard(adultWoman);
  });

  test('Have mother and newborn transfer together', async ({
    page,
    api,
    adultWoman,
    adultWomanVisit,
    newborn,
    newbornVisit,
  }) => {
    const motherName = getPatientName(adultWoman);
    const motherPatientIdentifier = getPatientIdentifierStr(adultWoman);
    const newbornName = getPatientName(newborn);
    const newbornPatientIdentifier = getPatientIdentifierStr(newborn);

    await changeLocation(api, KGHLocationsUuids['Labour and Delivery']);
    const wardPage = await WardPage.open(page);
    await wardPage.manageAdmissionRequests().click();

    await wardPage.addPatientToWardButton().click();
    await wardPage.patientSearchBar().click();
    await wardPage.patientSearchBar().fill(motherPatientIdentifier);
    await wardPage.patientSearchResult(motherName).click();
    await wardPage.admitPatientFromWorkspace().click();

    const bedNumber = '1';
    await wardPage.selectBed(bedNumber);
    await wardPage.clickAdmitButton();
    await wardPage.expectAdmissionSuccessNotification(motherName, bedNumber);

    await wardPage.manageAdmissionRequests().click();

    await wardPage.addPatientToWardButton().click();
    await wardPage.patientSearchBar().click();
    await wardPage.patientSearchBar().fill(newbornPatientIdentifier);
    await wardPage.patientSearchResult(newbornName).click();
    await wardPage.admitPatientFromWorkspace().click();

    await wardPage.selectBed(bedNumber);
    await test.step('wait for previous notifications to dismiss themselves', async () => {
      await page.waitForTimeout(5000);
    });
    await wardPage.clickAdmitButton();
    await wardPage.expectAdmissionSuccessNotification(newbornName, bedNumber);
    await wardPage.expectMotherChildBedShareTagInBed(bedNumber);
  });

  test('Bed Swapping a patient', async ({ page, api, adultWoman, adultWomanVisit, newborn, newbornVisit }) => {
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
    await test.step('admit and assign to bed 1', async () => {
      await wardPage.selectBed(bedNumber);
      await wardPage.clickAdmitButton();
      await wardPage.expectAdmissionSuccessNotification(patientName, bedNumber);
      await wardPage.expectPatientAdmittedToWard(adultWoman);
    });

    await wardPage.patientCard(patientName).click();
    await wardPage.transfersButton().click();
    await wardPage.swapButton().click();

    const newBedNumber = '2';
    await test.step('from one assigned bed to another assigned bed', async () => {
      await wardPage.selectBed(newBedNumber);
      await wardPage.clickSaveButton();
      await wardPage.expectBedSwapSuccess(patientName, newBedNumber);
    });

    await test.step('from assigned bed to no bed', async () => {
      await wardPage.patientCard(patientName).click();
      await wardPage.transfersButton().click();
      await wardPage.swapButton().click();
      await wardPage.selectNoBed();
      await wardPage.clickSaveButton();
      await wardPage.expectUnassignBedSuccess(patientName);
    });

    await test.step('from no bed to assigned bed', async () => {
      await wardPage.patientCard(patientName).click();
      await wardPage.transfersButton().click();
      await wardPage.swapButton().click();
      await wardPage.selectBed(bedNumber);
      await test.step('wait for previous notifications to dismiss themselves', async () => {
        await page.waitForTimeout(5000);
      });
      await wardPage.clickSaveButton();
      await wardPage.expectBedSwapSuccess(patientName, bedNumber);
    });

    const newbornName = getPatientName(newborn);
    const newbornPatientIdentifier = getPatientIdentifierStr(newborn);
    await test.step('admit another patient to bed 1', async () => {
      await wardPage.manageAdmissionRequests().click();
      await wardPage.addPatientToWardButton().click();
      await wardPage.patientSearchBar().click();
      await wardPage.patientSearchBar().fill(newbornPatientIdentifier);
      await wardPage.patientSearchResult(newbornName).click();
    });
  });
});
