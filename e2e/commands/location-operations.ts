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
  await expect(locationRes.ok()).toBeTruthy();
};
