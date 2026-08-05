import dayjs from 'dayjs';
import { type APIRequestContext, expect } from '@playwright/test';
import { type Visit } from '@openmrs/esm-framework';
import { KGHVisitType } from '../core';

/**
 * Mostly taken from openmrs-esm-patient-management
 */

export const startVisit = async (api: APIRequestContext, patientId: string, locationUuid: string): Promise<Visit> => {
  const visitRes = await api.post('visit', {
    data: {
      startDatetime: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZZ'),
      patient: patientId,
      location: locationUuid,
      visitType: KGHVisitType,
      attributes: [],
    },
  });

  await expect(visitRes.ok()).toBeTruthy();
  return await visitRes.json();
};

export const endVisit = async (api: APIRequestContext, uuid: string, locationUuid: string) => {
  await api.post(`visit/${uuid}`, {
    data: {
      location: locationUuid,
      visitType: KGHVisitType,
      stopDatetime: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZZ'),
    },
  });
};
