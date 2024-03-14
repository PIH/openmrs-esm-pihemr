import React from 'react';
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from '@carbon/react';
import { ConfigurableLink, interpolateString, useConfig } from '@openmrs/esm-framework';
import { Trans } from 'react-i18next';
import { formatDate } from '../util';

export interface ReferralsTableProps {
  referrals: Referral[];
}

export default function ReferrablesTable(props: ReferralsTableProps) {
  const config = useConfig();

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>
            <Trans i18nKey="emr-id">EMR ID</Trans>
          </TableHeader>
          <TableHeader>
            <Trans i18nKey="name">Name</Trans>
          </TableHeader>
          <TableHeader>
            <Trans i18nKey="referral-date">Referral Date</Trans>
          </TableHeader>
          <TableHeader>
            <Trans i18nKey="referral-type">Referral Type</Trans>
          </TableHeader>
          <TableHeader>
            <Trans i18nKey="details">Details</Trans>
          </TableHeader>
          <TableHeader>
            <Trans i18nKey="status">Status</Trans>
          </TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {props.referrals &&
          props.referrals.map((referral, index) => (
            <React.Fragment key={index}>
              <TableRow>
                <TableCell>
                  <ConfigurableLink
                    to={interpolateString(config.links.patientDash, {
                      patientUuid: referral.patient_uuid || referral.person_uuid,
                    })}>
                    {referral.zl_emr_id}
                  </ConfigurableLink>
                </TableCell>
                <TableCell>{referral.patient_name}</TableCell>
                <TableCell>
                  <ConfigurableLink
                    to={interpolateString(config.links.visitPage, {
                      patientUuid: referral.patient_uuid || referral.person_uuid,
                      visitUuid: referral.visit_uuid,
                    })}>
                    {formatDate(referral.referral_date)}
                  </ConfigurableLink>
                </TableCell>
                <TableCell>{referral.referral_type}</TableCell>
                <TableCell>{referral.details}</TableCell>
                <TableCell>
                  {config.pendingStatuses.includes(referral.fulfillment_status) ? (
                    <ConfigurableLink
                      to={interpolateString(config.links.homeVisitForm, {
                        patientUuid: referral.patient_uuid || referral.person_uuid,
                        visitUuid: referral.visit_uuid,
                        encounterUuid: referral.encounter_uuid,
                      })}>
                      {referral.fulfillment_status}
                    </ConfigurableLink>
                  ) : (
                    referral.fulfillment_status
                  )}
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
      </TableBody>
    </Table>
  );
}
