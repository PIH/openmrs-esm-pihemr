import { changeLocation, getPatientIdentifierStr, getPatientName } from '../../commands';
import { KGHLocationsUuids, test } from '../../core';
import { DispensingPage } from '../../pages/dispensing-page';

test.describe('Dispensing', () => {
  test.beforeEach(async ({ api }) => {
    await changeLocation(api, KGHLocationsUuids['Maternity Pharmacy']);
  });

  test('Create a paper prescription, elect to not dispense, and verify it appears as an active prescription', async ({
    page,
    adultWoman,
    adultWomanVisit,
  }) => {
    const patientName = getPatientName(adultWoman);
    const patientIdentifier = getPatientIdentifierStr(adultWoman);
    const ordererName = process.env.E2E_DEFAULT_PROVIDER_NAME;

    const dispensingPage = await DispensingPage.open(page);

    const orderBasket = await dispensingPage.createPaperPrescription(
      patientIdentifier,
      'Labour and Delivery',
      ordererName,
    );
    await orderBasket.addDrugToBasket('Calcium Vitamin D3');
    await orderBasket.openIncompleteOrder('Calcium Vitamin D3');
    await orderBasket.fillDrugOrderForm({
      dose: '2',
      route: 'Oral',
      frequency: 'OD (once daily)',
      duration: '5',
      quantity: '2',
      refills: '0',
    });
    await orderBasket.saveOrder();
    await orderBasket.signOrder();
    await orderBasket.createOrderWithoutDispensing();
    await dispensingPage.openActivePrescriptionsTab();

    await dispensingPage.selectLocationForActivePrescriptionTableFilter('Labour and Delivery');
    await dispensingPage.searchPrescriptions(patientIdentifier);
    await dispensingPage.expectActivePrescriptionForPatient(patientName, 'Calcium Vitamin D3');
  });

  test('Create a paper prescription , elect to dispenseand, and verify it appears as an active prescription', async ({
    page,
    adultWoman,
    adultWomanVisit,
  }) => {
    const patientName = getPatientName(adultWoman);
    const patientIdentifier = getPatientIdentifierStr(adultWoman);
    const ordererName = process.env.E2E_DEFAULT_PROVIDER_NAME;

    const dispensingPage = await DispensingPage.open(page);

    const orderBasket = await dispensingPage.createPaperPrescription(
      patientIdentifier,
      'Labour and Delivery',
      ordererName,
    );
    await orderBasket.addDrugToBasket('Calcium Vitamin D3');
    await orderBasket.openIncompleteOrder('Calcium Vitamin D3');
    await orderBasket.fillDrugOrderForm({
      dose: '2',
      route: 'Oral',
      frequency: 'OD (once daily)',
      duration: '5',
      quantity: '2',
      refills: '0',
    });
    await orderBasket.saveOrder();
    await orderBasket.signOrder();
    await orderBasket.createOrderAnddispenseAllPrescriptions();
    await dispensingPage.openActivePrescriptionsTab();

    await dispensingPage.selectLocationForActivePrescriptionTableFilter('Labour and Delivery');
    await dispensingPage.searchPrescriptions(patientIdentifier);

    await dispensingPage.expectNoPrescriptionForPatient(patientName);

    await dispensingPage.openAllPrescriptionsTab();
    await dispensingPage.selectLocationForActivePrescriptionTableFilter('Labour and Delivery');
    await dispensingPage.searchPrescriptions(patientIdentifier);

    await dispensingPage.expectActivePrescriptionForPatient(patientName, 'Calcium Vitamin D3');
  });
});
