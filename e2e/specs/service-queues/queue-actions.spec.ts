import { changeLocation, getPatientIdentifierStr, getPatientName } from '../../commands';
import { KGHLocationsUuids, test } from '../../core';
import { ServiceQueuesPage } from '../../pages/service-queues-page';

test.describe('Service Queues', () => {
  test.beforeEach(async ({ api }) => {
    await changeLocation(api, KGHLocationsUuids['MCOE Triage']);
  });

  test('Add a patient to the Triage Queue, triage them into "in-service" status, then undo', async ({
    page,
    adultWoman,
    adultWomanVisit,
  }) => {
    const patientName = getPatientName(adultWoman);
    const patientIdentifier = getPatientIdentifierStr(adultWoman);

    const serviceQueuesPage = await ServiceQueuesPage.open(page);

    await serviceQueuesPage.addPatientToQueue(patientIdentifier);

    await serviceQueuesPage.expectPatientInWaitingQueue(patientName);
    await serviceQueuesPage.triagePatient(patientName);

    await page.reload();

    await serviceQueuesPage.expectPatientInInServiceQueue(patientName);

    await serviceQueuesPage.dismissWorkspace();

    await serviceQueuesPage.undoQueueTransition(patientName);
    await serviceQueuesPage.expectPatientInWaitingQueue(patientName);
  });

  test('Add a patient to the Triage Queue, then remove them', async ({ page, adultWoman, adultWomanVisit }) => {
    const patientName = getPatientName(adultWoman);
    const patientIdentifier = getPatientIdentifierStr(adultWoman);

    const serviceQueuesPage = await ServiceQueuesPage.open(page);

    await serviceQueuesPage.addPatientToQueue(patientIdentifier);

    await serviceQueuesPage.expectPatientInWaitingQueue(patientName);
    await serviceQueuesPage.removePatientFromQueue(patientName);
    await serviceQueuesPage.expectPatientNotInWaitingQueue(patientName);
  });

  test('Add a patient to the Triage Queue, then delete them', async ({ page, adultWoman, adultWomanVisit }) => {
    const patientName = getPatientName(adultWoman);
    const patientIdentifier = getPatientIdentifierStr(adultWoman);

    const serviceQueuesPage = await ServiceQueuesPage.open(page);

    await serviceQueuesPage.addPatientToQueue(patientIdentifier);

    await serviceQueuesPage.expectPatientInWaitingQueue(patientName);
    await serviceQueuesPage.deletePatientFromQueue(patientName);
    await serviceQueuesPage.expectPatientNotInWaitingQueue(patientName);
  });
});
