import { type APIRequestContext, expect } from '@playwright/test';

/**
 * Mostly taken from openmrs-esm-patient-management
 */

export const changeLocation = async (api: APIRequestContext, locationUuid: string) => {
  const locationRes = await api.post('session', {
    data: {
      sessionLocation: locationUuid,
    },
  });
  if (!locationRes.ok()) {
    const errorBody = await locationRes.text();
    throw new Error(`Failed to change location. Status: ${locationRes.status()}, Body: ${errorBody}`);
  }
  await expect(locationRes.ok()).toBeTruthy();
};
