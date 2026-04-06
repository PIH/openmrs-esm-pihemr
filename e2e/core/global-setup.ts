import { request } from '@playwright/test';
import * as dotenv from 'dotenv';

/**
 * Mostly taken from openmrs-esm-patient-management
 */

dotenv.config();

/**
 * This configuration is to reuse the signed-in state in the tests
 * by log in only once using the API and then skip the log in step for all the tests.
 *
 * https://playwright.dev/docs/auth#reuse-signed-in-state
 */

async function globalSetup() {
  const requestContext = await request.newContext();
  const token = Buffer.from(`${process.env.E2E_USER_ADMIN_USERNAME}:${process.env.E2E_USER_ADMIN_PASSWORD}`).toString(
    'base64',
  );
  const res = await requestContext.post(`${process.env.E2E_BASE_URL}/ws/rest/v1/session`, {
    data: {
      sessionLocation: process.env.E2E_LOGIN_DEFAULT_LOCATION_UUID,
      locale: 'en',
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${token}`,
    },
  });

  const text = await res.text();
  // eslint-disable-next-line no-console
  console.log('login response', res.status(), text);
  await requestContext.storageState({ path: 'e2e/storageState.json' });
  await requestContext.dispose();
}

export default globalSetup;
