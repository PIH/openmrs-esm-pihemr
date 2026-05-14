import { type APIRequestContext, type Page, test as base } from '@playwright/test';
import { api } from '../fixtures';
import { generateRandomPatient, deletePatient, startVisit, endVisit, addMotherChildRelationship } from '../commands';
import { type Patient, type Visit } from '@openmrs/esm-framework';
import { KGHLocationsUuids } from './constants';

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
  newborn: Patient;
  newbornVisit: Visit;
  newborn2: Patient;
  newborn2Visit: Visit;
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
    { scope: 'test' },
  ],
  adultWomanVisit: [
    async ({ api, adultWoman }, use) => {
      const visit = await startVisit(api, adultWoman.uuid, KGHLocationsUuids.KGH);
      await use(visit);
      await endVisit(api, visit.uuid);
    },
    { scope: 'test' },
  ],
  newborn: [
    async ({ api, adultWoman }, use) => {
      const newborn = await generateRandomPatient(api, 'newborn', KGHLocationsUuids.KGH);
      await addMotherChildRelationship(api, adultWoman.uuid, newborn.uuid);
      await use(newborn);
      await deletePatient(api, newborn.uuid);
    },
    { scope: 'test' },
  ],
  newbornVisit: [
    async ({ api, newborn }, use) => {
      const visit = await startVisit(api, newborn.uuid, KGHLocationsUuids.KGH);
      await use(visit);
      await endVisit(api, visit.uuid);
    },
    { scope: 'test' },
  ],
  newborn2: [
    async ({ api, adultWoman }, use) => {
      const newborn = await generateRandomPatient(api, 'newborn', KGHLocationsUuids.KGH);
      await addMotherChildRelationship(api, adultWoman.uuid, newborn.uuid);
      await use(newborn);
      await deletePatient(api, newborn.uuid);
    },
    { scope: 'test' },
  ],
  newborn2Visit: [
    async ({ api, newborn2 }, use) => {
      const visit = await startVisit(api, newborn2.uuid, KGHLocationsUuids.KGH);
      await use(visit);
      await endVisit(api, visit.uuid);
    },
    { scope: 'test' },
  ],
});

// decorator method
export function step(target: Function, context: ClassMethodDecoratorContext) {
  return function replacementMethod(...args: any) {
    const name = this.constructor.name + '.' + (context.name as string);
    return test.step(
      name,
      async () => {
        return await target.call(this, ...args);
      },
      { box: true },
    );
  };
}
