import { type APIRequestContext, expect } from '@playwright/test';

/**
 * Mostly taken from openmrs-esm-patient-management
 */

/**
 * Sets the session location.
 *
 * Note this also covers the browser, not just the `api` fixture: the fixture's request context
 * inherits `use.storageState` from the Playwright config, so it loads the same JSESSIONID as the
 * browser context and the two share one server-side session. That matters because pihapps'
 * RequireLoginLocationFilter is mapped to every URL and redirects to loginLocation.page unless the
 * requesting session has a location -- so calling this is what lets `page.goto` reach a legacy
 * .page URL at all.
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
