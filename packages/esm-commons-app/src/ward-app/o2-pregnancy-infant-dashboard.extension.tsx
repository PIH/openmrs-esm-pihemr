import { InlineLoading } from '@carbon/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useActivePatientEnrollment } from '../hooks/useProgramEnrollment';
import O2IFrame from './o2-iframe.component';
import styles from './o2-pregnancy-infant-dashboard.scss';

/**
 * Extension to display either the O2 pregnancy program or infant program dashboard,
 * if the patient is enrolled in it.
 */
const O2PregnancyInfantProgramDashboard: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const infantProgramUuid = 'dc1b588a-9b94-45e4-8346-71b7c9a24845';
  const pregnancyProgramUuid = '6a5713c2-3fd5-46e7-8f25-36a0f7871e12';

  const { data: programs, isLoading } = useActivePatientEnrollment(patientUuid);
  const { t } = useTranslation();

  const inInfantProgram = programs?.data?.results?.some((enrollment) => enrollment.program.uuid == infantProgramUuid);
  const inPregnancyProgram = programs?.data?.results?.some(
    (enrollment) => enrollment.program.uuid == pregnancyProgramUuid,
  );

  const elementsToHide = [
    'header',
    '.patient-header',
    '#breadcrumbs',
    '.action-section',
    '.visits-section',
    '.pregnancy\\.dashboard\\.ancInitialEncounters',
    '.pregnancy\\.dashboard\\.ancFollowupEncounters',
    '.pregnancy\\.dashboard\\.riskFactors a.right',
    '.pregnancy\\.dashboard\\.temperature a.right',
    '.pregnancy\\.dashboard\\.postpartumDailyProgressEncounters',
    '.pregnancy\\.dashboard\\.laborAndDeliverySummaryEncounters',
    '.pregnancy\\.dashboard\\.maternalAdmissionEncounters',
    '.patient-location',
    '.pregnancy\\.dashboard\\.currentEnrollment',
    '.infant\\.dashboard\\.newbornAssesmentEncounters',
    '.infant\\.dashboard\\.newbornDailyProgressEncounters',
    '.infant\\.dashboard\\.currentEnrollment',
    '.program-history',
    '.allergies .cancel',
  ];

  const elementsToDisable = [
    '.pregnancy\\.dashboard\\.riskFactors a',
    '.pregnancy\\.dashboard\\.temperature a',
    '.infant\\.dashboard\\.indicator a',
  ];

  const o2PatientChartLink = (
    <div className={styles.patientChartLinkContainer}>
      <a href={`/openmrs/coreapps/clinicianfacing/patient.page?patientId=${patientUuid}`}>Full patient chart</a>
    </div>
  );

  if (isLoading) {
    return <InlineLoading />;
  } else if (inInfantProgram) {
    const src = `${window.openmrsBase}/coreapps/clinicianfacing/patient.page?patientId=${patientUuid}&dashboard=${infantProgramUuid}`;
    return (
      <>
        {o2PatientChartLink}
        <O2IFrame key={patientUuid} {...{ src, elementsToDisable, elementsToHide }} />
      </>
    );
  } else if (inPregnancyProgram) {
    const src = `${window.openmrsBase}/coreapps/clinicianfacing/patient.page?patientId=${patientUuid}&dashboard=${pregnancyProgramUuid}`;
    return (
      <>
        {o2PatientChartLink}
        <O2IFrame key={patientUuid} {...{ src, elementsToDisable, elementsToHide }} />
      </>
    );
  } else {
    return (
      <div>
        {o2PatientChartLink}
        {t(
          'patientNotEnrolledInInfantOrPregnancyProgram',
          'Patient not enrolled in either Infant or Pregnancy Program',
        )}
      </div>
    );
  }
};

export default O2PregnancyInfantProgramDashboard;
