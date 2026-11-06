import React from 'react';
import { render, screen } from '@testing-library/react';
import ReferralsTable, { isPendingReferral } from './referrals-table.component';
import { configSchema } from '../config-schema';

const PENDING_STATUS_UUID = '162866AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const REFERRAL_UNMET_UUID = '160068AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const COMPLETED_UUID = '3cd93172-26fe-102b-80cb-0017a47871b2';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useConfig: () => ({
    links: {
      patientDash: '${openmrsBase}/patient?patientId=${patientUuid}',
      visitPage: '${openmrsBase}/visit?patient=${patientUuid}&visit=${visitUuid}',
      // the real default, so the test catches a return url that does not follow the server's context path
      homeVisitForm: jest.requireActual('../config-schema').configSchema.links.homeVisitForm._default,
    },
    pendingStatusConceptUuids: ['162866AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '160068AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    pendingStatuses: ['Pending status', 'Referral unmet'],
  }),
}));

(window as any).openmrsBase = '/openmrs';
(window as any).spaBase = '/openmrs/spa';
(window as any).getOpenmrsSpaBase = () => '/openmrs/spa/';

function referral(id: string, overrides: Partial<Referral>): Referral {
  return {
    details: null,
    encounter_uuid: `encounter-${id}`,
    encounter_id: 1,
    patient_name: `Patient ${id}`,
    referral_date: '2020-03-25T00:00:00.000-0400',
    referral_type: 'Jeneral',
    status: null,
    visit_uuid: `visit-${id}`,
    zl_emr_id: id,
    fulfillment_status: null,
    patient_uuid: `patient-${id}`,
    ...overrides,
  };
}

function statusCell(text: string) {
  return screen.getByText(text);
}

describe('referrals table status links', () => {
  it('links pending statuses by concept uuid when the status name is translated', () => {
    render(
      <ReferralsTable
        referrals={[
          referral('PT1', { fulfillment_status: 'Referans an atant', fulfillment_status_uuid: PENDING_STATUS_UUID }),
          referral('PT2', { fulfillment_status: 'Referans lan pa fèt', fulfillment_status_uuid: REFERRAL_UNMET_UUID }),
        ]}
      />,
    );

    const pending = statusCell('Referans an atant');
    expect(pending.tagName).toBe('A');
    expect(pending.getAttribute('href')).toContain('encounterId=encounter-PT1');
    expect(pending.getAttribute('href')).toContain('section-mch-referral.xml');
    expect(statusCell('Referans lan pa fèt').tagName).toBe('A');
  });

  it('returns from the referral form to the queue under the server context path', () => {
    expect(configSchema.links.homeVisitForm._default).not.toContain('/mirebalais/');

    render(
      <ReferralsTable
        referrals={[
          referral('PT1', { fulfillment_status: 'Pending status', fulfillment_status_uuid: PENDING_STATUS_UUID }),
        ]}
      />,
    );

    const href = statusCell('Pending status').getAttribute('href');
    expect(href).toMatch(/^\/openmrs\/htmlformentryui\//);
    expect(new URL(href, 'http://localhost').searchParams.get('returnUrl')).toBe('/openmrs/spa/referrals-queue');
  });

  it('does not link statuses whose concept uuid is not pending', () => {
    render(
      <ReferralsTable
        referrals={[referral('PT1', { fulfillment_status: 'Fini', fulfillment_status_uuid: COMPLETED_UUID })]}
      />,
    );

    expect(statusCell('Fini').tagName).not.toBe('A');
  });

  it('uses the concept uuid rather than the name when the report returns both', () => {
    render(
      <ReferralsTable
        referrals={[referral('PT1', { fulfillment_status: 'Pending status', fulfillment_status_uuid: COMPLETED_UUID })]}
      />,
    );

    expect(statusCell('Pending status').tagName).not.toBe('A');
  });

  it('falls back to the status name when the report does not return the uuid', () => {
    render(
      <ReferralsTable
        referrals={[
          referral('PT1', { fulfillment_status: 'Referral unmet' }),
          referral('PT2', { fulfillment_status: 'Referans an atant' }),
        ]}
      />,
    );

    expect(statusCell('Referral unmet').tagName).toBe('A');
    expect(statusCell('Referans an atant').tagName).not.toBe('A');
  });
});

describe('isPendingReferral', () => {
  const config = {
    pendingStatusConceptUuids: [PENDING_STATUS_UUID, REFERRAL_UNMET_UUID],
    pendingStatuses: ['Pending status', 'Referral unmet'],
  };

  it('is false for a referral without a status', () => {
    expect(isPendingReferral(referral('PT1', {}), config)).toBe(false);
  });

  it('is false when the pending lists are not configured', () => {
    expect(
      isPendingReferral(
        referral('PT1', { fulfillment_status: 'Pending status', fulfillment_status_uuid: PENDING_STATUS_UUID }),
        {},
      ),
    ).toBe(false);
    expect(isPendingReferral(referral('PT1', { fulfillment_status: 'Pending status' }), {})).toBe(false);
  });
});
