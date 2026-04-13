import dayjs from 'dayjs';
import { type APIRequestContext, expect } from '@playwright/test';
import { type Visit } from '@openmrs/esm-framework';
import { KGHVisitType } from '../core';

/**
 * Mostly taken from openmrs-esm-patient-management
 */

export const startVisit = async (api: APIRequestContext, patientId: string, locationUuid?: string): Promise<Visit> => {
  const visitRes = await api.post('visit', {
    data: {
      startDatetime: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZZ'),
      patient: patientId,
      location: locationUuid || process.env.E2E_LOGIN_DEFAULT_LOCATION_UUID,
      visitType: KGHVisitType,
      attributes: [],
    },
  });

  await expect(visitRes.ok()).toBeTruthy();
  return await visitRes.json();
};

export const endVisit = async (api: APIRequestContext, uuid: string, isWardTest = false) => {
  await api.post(`visit/${uuid}`, {
    data: {
      location: isWardTest ? process.env.E2E_WARD_LOCATION_UUID : process.env.E2E_LOGIN_DEFAULT_LOCATION_UUID,
      visitType: KGHVisitType,
      stopDatetime: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZZ'),
    },
  });
};
