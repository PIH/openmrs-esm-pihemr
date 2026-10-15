import { expect } from '@playwright/test';
import { changeLocation } from '../../commands';
import { KGHLocationsUuids, test } from '../../core';
import { O2AddLabOrdersPage, O2LabOrdersPage, O2PatientLabOrdersPage } from '../../pages/o2/labs';

const TEST_CBC_3_PART_DIFF = 'CBC 3-part diff';
const TEST_CBC_5_PART_DIFF = 'CBC 5-part diff';
const TEST_COAGULATION_PROFILE = 'Coagulation profile';
const TEST_LIPID_PROFILE = 'Lipid profile';
const TEST_LIVER_FUNCTION = 'Liver function';

// Reasons come from the "Reason lab procedure not performed" concept's answers.
const NOT_PERFORMED_REASON = 'Insufficient sample';
const NOT_COLLECTED_REASON = 'Specimen not available';

test.describe('Lab Orders', () => {
  test.beforeEach(async ({ api }) => {
    // pihapps' RequireLoginLocationFilter redirects every URL to loginLocation.page until the
    // session has a location, so this is a precondition for reaching the lab pages at all.
    await changeLocation(api, KGHLocationsUuids.Laboratory);
  });

  test('Order a lab test, collect the specimen, then record the result as completed', async ({ page, adultWoman }) => {
    const addLabOrdersPage = await O2AddLabOrdersPage.open(page, adultWoman);
    await addLabOrdersPage.selectCategory('Haematology');
    await addLabOrdersPage.selectLabTest(TEST_CBC_3_PART_DIFF);
    await addLabOrdersPage.expectDraftOrderCount(1);
    await addLabOrdersPage.save();
    await addLabOrdersPage.expectOrdersSaved();

    const labOrdersPage = await O2LabOrdersPage.open(page);
    await labOrdersPage.filterByPatient(adultWoman);
    await labOrdersPage.expectOrderCount(1);
    await labOrdersPage.expectOrderStatus(TEST_CBC_3_PART_DIFF, 'Ordered');

    const specimenCollectionForm = await labOrdersPage.collectSpecimen(TEST_CBC_3_PART_DIFF);
    await specimenCollectionForm.waitUntilReady();
    await specimenCollectionForm.fillLabId(`E2E Test ${Date.now()}`);
    await specimenCollectionForm.save();
    await labOrdersPage.expectBackOnOrdersList();
    await labOrdersPage.expectOrderStatus(TEST_CBC_3_PART_DIFF, 'Collected');

    const recordResultsForm = await labOrdersPage.recordResults(TEST_CBC_3_PART_DIFF);
    await recordResultsForm.waitUntilReady();
    await recordResultsForm.selectStatus('Completed');
    await recordResultsForm.save();
    await labOrdersPage.expectBackOnOrdersList();
    await labOrdersPage.expectOrderStatus(TEST_CBC_3_PART_DIFF, 'Reported');
  });

  test('Order five lab tests and take each one to a different fulfillment status', async ({ page, adultWoman }) => {
    const addLabOrdersPage = await O2AddLabOrdersPage.open(page, adultWoman);
    await addLabOrdersPage.selectCategory('Haematology');
    await addLabOrdersPage.selectLabTest(TEST_CBC_3_PART_DIFF);
    await addLabOrdersPage.selectLabTest(TEST_CBC_5_PART_DIFF);
    await addLabOrdersPage.selectLabTest(TEST_COAGULATION_PROFILE);
    await addLabOrdersPage.selectCategory('Biochemistry');
    await addLabOrdersPage.selectLabTest(TEST_LIPID_PROFILE);
    await addLabOrdersPage.selectLabTest(TEST_LIVER_FUNCTION);
    await addLabOrdersPage.expectDraftOrderCount(5);
    await addLabOrdersPage.save();
    await addLabOrdersPage.expectOrdersSaved();

    const labOrdersPage = await O2LabOrdersPage.open(page);
    await labOrdersPage.filterByPatient(adultWoman);
    await labOrdersPage.expectOrderCount(5);
    await labOrdersPage.expectOrderStatuses({
      [TEST_CBC_3_PART_DIFF]: 'Ordered',
      [TEST_CBC_5_PART_DIFF]: 'Ordered',
      [TEST_COAGULATION_PROFILE]: 'Ordered',
      [TEST_LIPID_PROFILE]: 'Ordered',
      [TEST_LIVER_FUNCTION]: 'Ordered',
    });

    await labOrdersPage.switchToGroupByPatient();
    await labOrdersPage.expectPatientStatus(adultWoman, 'All ordered');

    // Bulk specimen collection is only reachable from the patient group row. All five orders come
    // pre-selected; collect three of them.
    const specimenCollectionForm = await labOrdersPage.collectSpecimenForPatient(adultWoman);
    await specimenCollectionForm.waitUntilReady();
    await specimenCollectionForm.expectOrderSelected(TEST_CBC_3_PART_DIFF, true);
    await specimenCollectionForm.uncheckOrder(TEST_CBC_5_PART_DIFF);
    await specimenCollectionForm.uncheckOrder(TEST_COAGULATION_PROFILE);
    await specimenCollectionForm.fillLabId(`E2E Test ${Date.now()}`);
    await specimenCollectionForm.save();
    await labOrdersPage.expectBackOnOrdersList();

    await labOrdersPage.switchToGroupByOrder();
    await labOrdersPage.expectOrderStatuses({
      [TEST_CBC_3_PART_DIFF]: 'Collected',
      [TEST_LIPID_PROFILE]: 'Collected',
      [TEST_LIVER_FUNCTION]: 'Collected',
      [TEST_CBC_5_PART_DIFF]: 'Ordered',
      [TEST_COAGULATION_PROFILE]: 'Ordered',
    });

    await labOrdersPage.switchToGroupByPatient();
    await labOrdersPage.expectPatientStatus(adultWoman, 'Mixed');
    await labOrdersPage.switchToGroupByOrder();

    // Two of the collected orders get results reported.
    for (const labTestName of [TEST_CBC_3_PART_DIFF, TEST_LIPID_PROFILE]) {
      const recordResultsForm = await labOrdersPage.recordResults(labTestName);
      await recordResultsForm.waitUntilReady();
      await recordResultsForm.selectStatus('Completed');
      await recordResultsForm.save();
      await labOrdersPage.expectBackOnOrdersList();
      await labOrdersPage.expectOrderStatus(labTestName, 'Reported');
    }

    // The third collected order is marked not performed. A collected order offers no "Mark as Not
    // Collected" action, so this transition runs through the results form's Lab Status instead.
    const notPerformedResultsForm = await labOrdersPage.recordResults(TEST_LIVER_FUNCTION);
    await notPerformedResultsForm.waitUntilReady();
    await notPerformedResultsForm.selectStatus('Not performed');
    await notPerformedResultsForm.selectReasonNotPerformed(NOT_PERFORMED_REASON);
    await notPerformedResultsForm.save();
    await labOrdersPage.expectBackOnOrdersList();
    await labOrdersPage.expectOrderStatus(TEST_LIVER_FUNCTION, 'Not performed');

    // One of the still-ordered tests is cancelled from the patient's own lab orders page.
    const patientLabOrdersPage = await O2PatientLabOrdersPage.open(page, adultWoman);
    await patientLabOrdersPage.cancelOrder(TEST_CBC_5_PART_DIFF);

    const labOrdersPageAfterCancel = await O2LabOrdersPage.open(page);
    await labOrdersPageAfterCancel.filterByPatient(adultWoman);
    await labOrdersPageAfterCancel.expectOrderStatus(TEST_CBC_5_PART_DIFF, 'Canceled');
    await labOrdersPageAfterCancel.switchToGroupByPatient();
    await labOrdersPageAfterCancel.expandPatientRow(adultWoman);
    await labOrdersPageAfterCancel.expectPatientSubRowStatus(adultWoman, TEST_CBC_5_PART_DIFF, 'Canceled');
    await labOrdersPageAfterCancel.switchToGroupByOrder();

    // The last still-ordered test goes straight from Ordered to Not Performed.
    const notCollectedForm = await labOrdersPageAfterCancel.markAsNotCollected(TEST_COAGULATION_PROFILE);
    await notCollectedForm.waitUntilReady();
    await notCollectedForm.selectReason(NOT_COLLECTED_REASON);
    await notCollectedForm.save();
    await labOrdersPageAfterCancel.expectBackOnOrdersList();

    await labOrdersPageAfterCancel.expectOrderStatuses({
      [TEST_CBC_3_PART_DIFF]: 'Reported',
      [TEST_LIPID_PROFILE]: 'Reported',
      [TEST_LIVER_FUNCTION]: 'Not performed',
      [TEST_CBC_5_PART_DIFF]: 'Canceled',
      [TEST_COAGULATION_PROFILE]: 'Not performed',
    });
  });

  test.describe('Specimen collection from the patient lab orders page', () => {
    test('Collect the specimen at an admission location', async ({ api, page, adultWoman }) => {
      // Antenatal Ward carries the "Admission Location" tag
      await changeLocation(api, KGHLocationsUuids['Antenatal Ward']);

      const addLabOrdersPage = await O2AddLabOrdersPage.open(page, adultWoman);
      await addLabOrdersPage.selectCategory('Haematology');
      await addLabOrdersPage.selectLabTest(TEST_CBC_3_PART_DIFF);
      await addLabOrdersPage.expectDraftOrderCount(1);
      await addLabOrdersPage.save();
      await addLabOrdersPage.expectOrdersSaved();

      const patientLabOrdersPage = await O2PatientLabOrdersPage.open(page, adultWoman);
      await patientLabOrdersPage.expectCollectSpecimenAction(TEST_CBC_3_PART_DIFF, true);
      await patientLabOrdersPage.expectCollectSpecimenActionTitle(TEST_CBC_3_PART_DIFF, 'Collect specimen');

      const labId = `E2E Test ${Date.now()}`;
      const specimenCollectionForm = await patientLabOrdersPage.collectSpecimen(TEST_CBC_3_PART_DIFF);
      await specimenCollectionForm.waitUntilReady();
      await specimenCollectionForm.fillLabId(labId);
      await specimenCollectionForm.save();
      await patientLabOrdersPage.expectBackOnOrdersList();
      await patientLabOrdersPage.expectOrderStatus(TEST_CBC_3_PART_DIFF, 'Collected');

      // The action remains available once collected, and reopens the saved specimen collection for editing
      await patientLabOrdersPage.expectCollectSpecimenAction(TEST_CBC_3_PART_DIFF, true);
      await patientLabOrdersPage.expectCollectSpecimenActionTitle(TEST_CBC_3_PART_DIFF, 'Edit specimen collection');
      const editForm = await patientLabOrdersPage.collectSpecimen(TEST_CBC_3_PART_DIFF);
      await editForm.waitUntilReady();
      await editForm.expectLabId(labId);
      const updatedLabId = `${labId} Edited`;
      await editForm.fillLabId(updatedLabId);
      await editForm.save();
      await patientLabOrdersPage.expectBackOnOrdersList();

      const reopenedForm = await patientLabOrdersPage.collectSpecimen(TEST_CBC_3_PART_DIFF);
      await reopenedForm.waitUntilReady();
      await reopenedForm.expectLabId(updatedLabId);
      await reopenedForm.cancel();
      await patientLabOrdersPage.expectBackOnOrdersList();
    });

    test('Does not offer specimen collection at a non-admission location', async ({ page, adultWoman }) => {
      // The Laboratory location, set in beforeEach, is not tagged as an Admission Location
      const addLabOrdersPage = await O2AddLabOrdersPage.open(page, adultWoman);
      await addLabOrdersPage.selectCategory('Haematology');
      await addLabOrdersPage.selectLabTest(TEST_CBC_3_PART_DIFF);
      await addLabOrdersPage.expectDraftOrderCount(1);
      await addLabOrdersPage.save();
      await addLabOrdersPage.expectOrdersSaved();

      const patientLabOrdersPage = await O2PatientLabOrdersPage.open(page, adultWoman);
      await patientLabOrdersPage.expectOrderStatus(TEST_CBC_3_PART_DIFF, 'Ordered');
      await patientLabOrdersPage.expectCollectSpecimenAction(TEST_CBC_3_PART_DIFF, false);
      await patientLabOrdersPage.expectCancelAction(TEST_CBC_3_PART_DIFF, true);
    });

    test('Does not offer editing a collected specimen at a non-admission location, and recovers if it fails to load', async ({
      api,
      page,
      adultWoman,
    }) => {
      await changeLocation(api, KGHLocationsUuids['Antenatal Ward']);

      const addLabOrdersPage = await O2AddLabOrdersPage.open(page, adultWoman);
      await addLabOrdersPage.selectCategory('Haematology');
      await addLabOrdersPage.selectLabTest(TEST_CBC_3_PART_DIFF);
      await addLabOrdersPage.expectDraftOrderCount(1);
      await addLabOrdersPage.save();
      await addLabOrdersPage.expectOrdersSaved();

      let patientLabOrdersPage = await O2PatientLabOrdersPage.open(page, adultWoman);
      const specimenCollectionForm = await patientLabOrdersPage.collectSpecimen(TEST_CBC_3_PART_DIFF);
      await specimenCollectionForm.waitUntilReady();
      await specimenCollectionForm.fillLabId(`E2E Test ${Date.now()}`);
      await specimenCollectionForm.save();
      await patientLabOrdersPage.expectOrderStatus(TEST_CBC_3_PART_DIFF, 'Collected');

      // A failure to load the saved encounter must not strand the user on a spinner
      await patientLabOrdersPage.expectSpecimenCollectionLoadFailure(TEST_CBC_3_PART_DIFF);

      // The same collected order offers no specimen action once the session is at a non-admission location
      await changeLocation(api, KGHLocationsUuids.Laboratory);
      patientLabOrdersPage = await O2PatientLabOrdersPage.open(page, adultWoman);
      await patientLabOrdersPage.expectOrderStatus(TEST_CBC_3_PART_DIFF, 'Collected');
      await patientLabOrdersPage.expectCollectSpecimenAction(TEST_CBC_3_PART_DIFF, false);
    });
  });
});
