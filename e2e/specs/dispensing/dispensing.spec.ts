import { expect } from '@playwright/test';
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
    await dispensingPage.expectPrescriptionRowForPatient(patientName, 'Calcium Vitamin D3', 'Active');
  });

  test('Create a paper prescription , elect to dispense and, and verify it appears as an completed prescription', async ({
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

    await dispensingPage.expectPrescriptionRowForPatient(patientName, 'Calcium Vitamin D3', 'Completed');
  });

  test('Print the bag label and medication labels for a dispensed prescription', async ({
    page,
    adultWoman,
    adultWomanVisit,
  }) => {
    const patientName = getPatientName(adultWoman);
    const patientIdentifier = getPatientIdentifierStr(adultWoman);
    const ordererName = process.env.E2E_DEFAULT_PROVIDER_NAME;

    // Capture the label report request and answer with a minimal PDF so no real print dialog is needed
    const reportRequests: Array<string> = [];
    await page.route('**/ws/rest/v1/reportingrest/runReport/**', async (route) => {
      reportRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
      });
    });
    await page.addInitScript(() => {
      // Prevent the browser print dialog from blocking the test
      window.print = () => {};
    });

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

    await dispensingPage.openAllPrescriptionsTab();
    await dispensingPage.selectLocationForActivePrescriptionTableFilter('Labour and Delivery');
    await dispensingPage.searchPrescriptions(patientIdentifier);
    await dispensingPage.expandPrescriptionRow(patientName);

    // PIHEMR removes the stock "Print prescriptions" extension and slots in its own print labels button
    await expect(dispensingPage.printPrescriptionsButton()).toHaveCount(0);
    await dispensingPage.openPrintLabelsModal();

    // Everything is checked by default
    await expect(dispensingPage.bagLabelCheckbox()).toBeChecked();
    await expect(dispensingPage.labelCheckbox(/Calcium Vitamin D3/)).toBeChecked();

    await dispensingPage.modalPrintButton().click();
    await expect.poll(() => reportRequests.length).toBe(1);
    const params = new URL(reportRequests[0]).searchParams;
    expect(params.get('medicationDispenseUuids').split(',')).toHaveLength(1);
    expect(params.get('printBagLabel')).toBe('true');
    expect(params.get('encounterUuid')).toBeTruthy();
  });
});
