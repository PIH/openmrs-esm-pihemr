import { type APIRequestContext, type Page, test as base } from '@playwright/test';
import { api } from '../fixtures';
import { generateRandomPatient, deletePatient, startVisit, endVisit } from '../commands';
import { type Patient, type Visit } from '@openmrs/esm-framework';

/**
 * Mostly taken from openmrs-esm-patient-management
 */

// This file sets up our custom test harness using the custom fixtures.
// See https://playwright.dev/docs/test-fixtures#creating-a-fixture for details.
// If a spec intends to use one of the custom fixtures, the special `test` function
// exported from this file must be used instead of the default `test` function
// provided by playwright.

export interface CustomTestFixtures {
  adultWoman: Patient;
  adultWomanVisit: Visit;
}

export interface CustomWorkerFixtures {
  api: APIRequestContext;
}

export const test = base.extend<CustomTestFixtures, CustomWorkerFixtures>({
  api: [api, { scope: 'worker' }],
  adultWoman: [
    async ({ api }, use) => {
      const patient = await generateRandomPatient(api, 'adultWomen');
      await use(patient);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test', auto: true },
  ],
  adultWomanVisit: [
    async ({ api, adultWoman }, use) => {
      const visit = await startVisit(api, adultWoman.uuid, '074b2ab0-716a-11eb-8aa6-0242ac110002'); // kgh
      await use(visit);
      await endVisit(api, visit.uuid);
    },
    { scope: 'test', auto: true },
  ],
});
