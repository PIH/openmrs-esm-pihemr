import React from 'react';
import { of } from 'rxjs';
import { render, fireEvent, screen, within, waitFor } from '@testing-library/react';
import MockDate from 'mockdate';
import ReferralsQueue from './referrals-queue.component';
import { getReferrals } from './referrals-queue.resource';

const mockedUseConfig = jest.fn();

jest.mock('./referrals-queue.resource');
jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useConfig: () => mockedUseConfig(),
}));

const mockedGetReferrals = getReferrals as jest.Mock;

const referrals = [
  {
    patient_uuid: 'ptaaaaaa-2869-41a4-86af-811fa2ee65b8',
    zl_emr_id: 'PTID1',
    patient_name: 'Patient Commcare',
    referral_date: '2020-03-25T00:00:00.000-0400',
    details: null,
    visit_uuid: 'visitaaa-091a-46fd-a442-2a9778d91a52',
    encounter_id: 12,
    referral_type: 'Test Referral Type',
    encounter_uuid: 'encounter-0fe1-4318-95a4-641d31745e09',
    fulfillment_status: null,
  },
  {
    patient_uuid: 'ptbbbbbb-de0e-489f-b4c7-fe4579e07aa9',
    zl_emr_id: 'PTID2',
    patient_name: 'Davina Mother',
    referral_date: '2020-03-23T00:00:00.000-0400',
    details: 'Suspected depression',
    visit_uuid: 'visitbbb-64ca-4d53-9024-574a9214f76e',
    encounter_id: 13,
    referral_type: 'Mental Health',
    encounter_uuid: 'encounter-d5cb-4f7e-a1aa-bd6741a96381',
    fulfillment_status: 'Pending status',
  },
  {
    person_uuid: 'ptcccccc-de0e-489f-b4c7-fe4579e07aa9',
    zl_emr_id: 'PTID3',
    patient_name: 'Patient Prenatal',
    referral_date: '2020-03-28T00:00:00.000-0400',
    details: 'Urgent',
    visit_uuid: 'visitccc-64ca-4d53-9024-574a9214f76e',
    encounter_id: 14,
    referral_type: 'Family Member',
    encounter_uuid: 'encounter-67bc-435d-9929-670a98cefe4e',
    fulfillment_status: 'Test Complete',
  },
];

(window as any).openmrsBase = '/openmrs';
// hack around js-dom to make navigation testable
delete window.location;
//@ts-ignore
window.location = { href: '/referrals-queue' };

describe('referrals queue', () => {
  const todayString = '2020-10-31';
  beforeAll(() => {
    mockedUseConfig.mockReturnValue({
      links: {
        patientDash:
          '${openmrsBase}/coreapps/clinicianfacing/patient.page?patientId=${patientUuid}&app=pih.app.clinicianDashboard',
        visitPage:
          '${openmrsBase}/pihcore/visit/visit.page?patient=${patientUuid}&visit=${visitUuid}&suppressActions=true#/overview',
        homeVisitForm:
          '${openmrsBase}/htmlformentryui/htmlform/editHtmlFormWithStandardUi.page?patientId=${patientUuid}&visitId=${visitUuid}&encounterId=${encounterUuid}&definitionUiResource=file:configuration/pih/htmlforms/section-mch-referral.xml&returnUrl=/mirebalais/spa/referrals-queue',
      },
      pendingStatuses: ['Pending status', 'Referral unmet'],
    });
  });
  beforeEach(() => {
    MockDate.set(todayString + 'T10:00:00.000-0400');
    mockedGetReferrals.mockReset();
    mockedGetReferrals.mockReturnValue(of(referrals));
    render(<ReferralsQueue />);
  });

  afterEach(() => {
    MockDate.reset();
  });

  it('renders without failing', () => {
    // in beforeEach
  });

  it('renders the expected fields', () => {
    for (let referral of referrals) {
      const row = screen.getByText(referral.zl_emr_id).closest('tr');
      within(row).getByText(referral.patient_name);
      within(row).getByText(referral.referral_type, { selector: 'td' });
      if (referral.details) {
        within(row).getByText(referral.details);
      }
      if (referral.fulfillment_status) {
        within(row).getByText(referral.fulfillment_status);
      }
    }
    screen.getByText('25 Mar');
    screen.getByText('23 Mar');
    screen.getByText('28 Mar');
  });

  // TODO figure out how to test links
  it.skip('navigates to the links', async () => {
    const table = screen.getByRole('table');
    const pt0DashLink = within(table).getByText(referrals[0].zl_emr_id);
    fireEvent.click(pt0DashLink);
    await waitFor(() => {
      expect(window.location.href).toBe('/openmrs/pt-dash/' + referrals[0].patient_uuid);
    });
    const pt1VisitLink = within(table).getByText('23 Mar');
    fireEvent.click(pt1VisitLink);
    await waitFor(() => {
      expect(window.location.href).toBe(`/openmrs/visit/${referrals[1].patient_uuid}/${referrals[1].visit_uuid}`);
    });
    const pendingStatusLink = within(table).getByText('Pending status');
    fireEvent.click(pendingStatusLink);
    await waitFor(() => {
      expect(window.location.href).toBe(
        `/openmrs/home-visit-form/${referrals[1].patient_uuid}/${referrals[1].visit_uuid}/${referrals[1].encounter_uuid}`,
      );
    });
  });

  it("doesn't make non-pending statuses into links", () => {
    const table = screen.getByRole('table');
    expect(within(table).getByText('Pending status').tagName).toBe('A'); // sanity check
    expect(within(table).getByText('Test Complete').tagName).not.toBe('A'); // the actual test
  });

  it('filters by referral type', () => {
    fireEvent.click(
      screen.getByLabelText('Referral Type', {
        selector: 'button',
      }),
    );
    fireEvent.click(
      screen.getByText('Mental Health', {
        selector: 'div',
      }),
    );
    expect(screen.queryByText('PTID1')).toBeNull();
    expect(screen.queryByText('PTID2')).not.toBeNull();
    expect(screen.queryByText('PTID3')).toBeNull();
  });

  it('infers list of referral types from data', () => {
    expect(screen.queryByText('Test Referral Type', { selector: 'span' })).toBeNull(); // sanity check
    fireEvent.click(
      screen.getByLabelText('Referral Type', {
        selector: 'button',
      }),
    );
    fireEvent.click(
      screen.getByText('Test Referral Type', {
        selector: 'div',
      }),
    );
    expect(screen.queryByText('Test Referral Type', { selector: 'span' })).not.toBeNull();
  });

  it('filters by statuses, with dropdown inferred from data', () => {
    fireEvent.click(
      screen.getByLabelText('Status', {
        selector: 'button',
      }),
    );
    fireEvent.click(
      screen.getByText('Test Complete', {
        selector: 'div',
      }),
    );
    expect(screen.queryByText('PTID1')).toBeNull();
    expect(screen.queryByText('PTID2')).toBeNull();
    expect(screen.queryByText('PTID3')).not.toBeNull();
  });

  // TODO figure out how to interact with Carbon datepicker
  it.skip('calls getReferrals with the correct date arguments', () => {
    const monthAgoString = '2020-09-30';
    expect(mockedGetReferrals).lastCalledWith({
      fromDate: monthAgoString,
      toDate: todayString,
      locale: 'en',
    });
    const fromDateInput = screen.getByLabelText('From');
    fireEvent.change(fromDateInput, { target: { value: '2020-01-01' } });
    expect(mockedGetReferrals).lastCalledWith({
      fromDate: '2020-01-01',
      toDate: todayString,
      locale: 'en',
    });
    const toDateInput = screen.getByLabelText('To');
    fireEvent.change(toDateInput, { target: { value: '2020-03-01' } });
    expect(mockedGetReferrals).lastCalledWith({
      fromDate: '2020-01-01',
      toDate: '2020-03-01',
      locale: 'en',
    });
  });

  it('filters the list of results by patient name query', () => {
    const queryBox = screen.getByLabelText('Filter by patient');
    fireEvent.change(queryBox, { target: { value: 'Mother' } });
    expect(screen.queryByText('PTID2')).not.toBeNull();
    expect(screen.queryByText('PTID1')).toBeNull();
  });

  it('filters the list of results by patient name partial token matches', () => {
    const queryBox = screen.getByLabelText('Filter by patient');
    fireEvent.change(queryBox, { target: { value: 'dav mo' } });
    expect(screen.queryByText('PTID2')).not.toBeNull();
    expect(screen.queryByText('PTID1')).toBeNull();
  });

  it('filters the list of results by patient id', () => {
    const queryBox = screen.getByLabelText('Filter by patient');
    fireEvent.change(queryBox, { target: { value: 'ptid1' } });
    expect(screen.queryByText('PTID1')).not.toBeNull();
    expect(screen.queryByText('PTID2')).toBeNull();
  });

  test.todo('makes the API call with the locale from the user session');
});
