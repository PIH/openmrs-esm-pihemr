import React from 'react';
import { useConfig } from '@openmrs/esm-framework';
import cloneDeep from 'lodash-es/cloneDeep';
import {
  DataTable,
  Pagination,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react';
import { PDFDownloadLink } from '@react-pdf/renderer';

import styles from './ReportComponent.css';
import {
  getUserLocation,
  getConceptAnswers,
  getLocations,
  getEncounters,
  postSampleDropoffObs,
  voidSampleDropoff,
  postSampleStatusChangeObs,
  updateSampleStatusChangeObs,
  postReferralStatusChangeObs,
  updateReferralStatusChangeObs,
  type Concept,
  type EncounterResult,
} from '../Pathology-getter/ReportComponent.resource';
import MyDocument from '../Print-to-PDF/Document-Component';
import { type Config } from '../config-schema';

const ReportComponent = () => {
  const config = useConfig() as Config;
  const [userLocation, setUserLocation] = React.useState();
  const [encountersList, setEncountersList] = React.useState<Array<EncounterResult>>([]);
  const [sendingHospital, setSendingHospital] = React.useState('');
  const [listOfHospitals, setListOfHospitals] = React.useState([]);
  const [sampleStatusAnswers, setSampleStatusAnswers] = React.useState<Array<Concept>>([]);
  const [referralStatusAnswers, setReferralStatusAnswers] = React.useState<Array<Concept>>([]);
  const [sampleStatus, setSampleStatus] = React.useState('');
  const [referralStatus, setReferralStatus] = React.useState('');
  const [patientName, setPatientName] = React.useState('');
  const itemsPerPage = config.numberOfRequestsPerPage;
  const [currentPage, setCurrentPage] = React.useState(1);
  const headers = [
    {
      key: 'patientNames',
      header: 'Patient name',
    },
    {
      key: 'pathologyRequest',
      header: 'pathology request',
    },
    {
      key: 'sendingHospital',
      header: 'Sending Hospital',
    },
    {
      key: 'phoneNumber',
      header: 'Phone number',
    },
    {
      key: 'sampleStatus',
      header: 'Sample status',
    },
    {
      key: 'dateOfRequest',
      header: 'Date of Request',
    },
    {
      key: 'referralStatus',
      header: 'Plan status',
    },
    // {
    //   key: "sampleDropOff",
    //   header: "Sample drop off?",
    // },
    {
      key: 'pathologicDiagnosisObs',
      header: 'Pathologic diagnosis',
    },
    {
      key: 'resultsEncounter',
      header: 'Results',
    },
    {
      key: 'PDFReport',
      header: 'Report',
    },
  ];

  React.useEffect(() => {
    getUserLocation(config.healthCenterAttrTypeUUID).then(setUserLocation);
    getLocations().then(setListOfHospitals);
    getConceptAnswers(config.sampleStatusConceptUUID).then(setSampleStatusAnswers);
    getConceptAnswers(config.referralStatusConceptUUID).then(setReferralStatusAnswers);
    getEncounters(config.healthCenterAttrTypeUUID, config.pathologyFullAllowedLocationUUID).then(setEncountersList);
  }, []);

  const filteredEncList = encountersList
    .filter((encList) => !sampleStatus || encList.sampleStatusObs?.toLowerCase() == sampleStatus.toLowerCase())
    .filter((encList) => !referralStatus || encList.referralStatusObs?.toLowerCase() == referralStatus.toLowerCase())
    .filter(
      (encList) => !sendingHospital || encList.patientHealthCenter?.toLowerCase() == sendingHospital.toLowerCase(),
    )
    .filter((encList) => {
      if (!patientName) {
        return true;
      } else {
        // Given a patient name filter input, break it up into tokens.
        // Filter to patients for which each token matches.
        // Matching is case-insensitive and matches the beginning of each name.
        const nameTokens = patientName.split(/\s+/);
        const name = `${encList.family_name} ${encList.middle_name} ${encList.given_name}`;
        return nameTokens.every((token) => new RegExp('\\b' + token, 'i').test(name));
      }
    });

  const rows = filteredEncList.map((encounterInfo) => {
    return {
      id: encounterInfo.encounterId,
      patientNames: (
        <a data-testid="patientNames" href={`/openmrs/patientDashboard.form?patientId=${encounterInfo.personId}`}>
          {encounterInfo.family_name}
          {'  '}
          {encounterInfo.given_name}
          {'  '}
          {encounterInfo.middle_name}
        </a>
      ),
      pathologyRequest: (
        <a href={`/openmrs/module/htmlformentry/htmlFormEntry.form?encounterId=${encounterInfo.encounterId}&mode=VIEW`}>
          {' '}
          Link{' '}
        </a>
      ),
      sendingHospital: encounterInfo.patientHealthCenter,
      phoneNumber: encounterInfo.patientPhoneNumber || '',
      sampleStatus: (
        <select
          onChange={(e) =>
            sampleStatusChange(
              {
                uuid: e.target.value,
                display: e.target.options[e.target.selectedIndex].text,
              },
              encounterInfo,
            )
          }>
          <option value=""></option>
          {sampleStatusAnswers.map((ans) => (
            <option
              data-testid="sampleStatus-option"
              value={ans.uuid}
              key={ans.uuid}
              selected={encounterInfo.sampleStatusObs ? encounterInfo.sampleStatusObs === ans.display && true : false}>
              {ans.display}
            </option>
          ))}
        </select>
      ),
      dateOfRequest: new Date(encounterInfo.encounterDatetime).toLocaleString(['en-GB', 'en-US', 'en', 'fr-RW'], {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      }),
      referralStatus: (
        <select
          onChange={(e) =>
            referralStatusChange(
              {
                uuid: e.target.value,
                display: e.target.options[e.target.selectedIndex].text,
              },
              encounterInfo,
            )
          }>
          <option data-testid="referralStatus-option" value=""></option>
          {referralStatusAnswers.map((ans) => (
            <option
              value={ans.uuid}
              key={ans.uuid}
              selected={encounterInfo.referralStatusObs && encounterInfo.referralStatusObs === ans.display}>
              {ans.display}
            </option>
          ))}
        </select>
      ),
      // sampleDropOff: (
      //   <input
      //     data-testid="sampleDropOff"
      //     type="checkbox"
      //     checked={Boolean(encounterInfo.sampleDropoffObs)}
      //     onChange={(e) => sampleDropOffChange(encounterInfo)}
      //   />
      // ),
      pathologicDiagnosisObs: encounterInfo.pathologicDiagnosisObs,
      resultsEncounter: encounterInfo.resultsEncounterId ? (
        <a
          data-testid="resultsEncounter"
          href={`/openmrs/module/htmlformentry/htmlFormEntry.form?encounterId=${encounterInfo.resultsEncounterId}&mode=VIEW`}>
          {' '}
          Results{' '}
        </a>
      ) : (
        (!userLocation || userLocation === config.pathologyFullAllowedLocationUUID) && (
          <a
            href={`/openmrs/module/htmlformentry/htmlFormEntry.form?personId=${encounterInfo.personId}&patientId=${encounterInfo.personId}&returnUrl=&formId=${config.pathologyResultsFromID}&uuid=${encounterInfo.encounterUuid}`}>
            {' '}
            Fill in results{' '}
          </a>
        )
      ),
      PDFReport: encounterInfo.resultsEncounterId && encounterInfo.approvedBy && (
        <PDFDownloadLink
          document={<MyDocument encounterInfo={encounterInfo} config={config} />}
          fileName="Pathology Report">
          {({ loading }) => (loading ? 'loading...' : <button>Download</button>)}
        </PDFDownloadLink>
      ),
    };
  });

  const onPageChange = (event) => {
    setCurrentPage(event.page);
  };

  const offset = (currentPage - 1) * itemsPerPage;
  const currentPageData = rows.slice(offset, offset + itemsPerPage);

  const sampleDropOffChange = (encounterInfo) => {
    const tempEncList = cloneDeep(encountersList);
    if (!encounterInfo.sampleDropoffObs) {
      postSampleDropoffObs(
        encounterInfo,
        config.sampleDropOffconceptUUID,
        config.healthCenterAttrTypeUUID,
        config.yesConceptUUID,
      ).then((response) => {
        if (response.ok) {
          const encIndex = tempEncList.findIndex((enc) => enc.encounterUuid == encounterInfo.encounterUuid);
          tempEncList[encIndex].sampleDropoffObs = config.yesConceptName;
          tempEncList[encIndex].sampleDropoffObsUuid = response.data.uuid;
          setEncountersList(tempEncList);
        }
      });
    } else {
      voidSampleDropoff(encounterInfo.sampleDropoffObsUuid).then((response) => {
        if (response.ok) {
          const encIndex = tempEncList.findIndex((enc) => enc.encounterUuid == encounterInfo.encounterUuid);
          tempEncList[encIndex].sampleDropoffObs = '';
          tempEncList[encIndex].sampleDropoffObsUuid = '';
          setEncountersList(tempEncList);
        }
      });
    }
  };

  const sampleStatusChange = (newStatus: { uuid: string; display: string }, encounterInfo) => {
    const tempEncList = cloneDeep(encountersList);
    if (!encounterInfo.sampleStatusObs) {
      postSampleStatusChangeObs(
        newStatus.uuid,
        encounterInfo,
        config.sampleStatusConceptUUID,
        config.healthCenterAttrTypeUUID,
      ).then((response) => {
        if (response.ok) {
          const encIndex = tempEncList.findIndex((enc) => enc.encounterUuid == encounterInfo.encounterUuid);
          tempEncList[encIndex].sampleStatusObs = newStatus.display;
          tempEncList[encIndex].sampleStatusObsUuid = response.data.uuid;

          setEncountersList(tempEncList);
        } else {
          setEncountersList(tempEncList);
          //Need error message
        }
      });
    } else {
      updateSampleStatusChangeObs(
        newStatus,
        encounterInfo,
        config.sampleStatusConceptUUID,
        config.healthCenterAttrTypeUUID,
      ).then((response) => {
        if (response.ok) {
          const encIndex = tempEncList.findIndex((enc) => enc.encounterUuid == encounterInfo.encounterUuid);
          tempEncList[encIndex].sampleStatusObs = newStatus.display;
          tempEncList[encIndex].sampleStatusObsUuid = response.data.uuid;
          setEncountersList(tempEncList);
        } else {
          setEncountersList(tempEncList);
          //Need error message
        }
      });
    }
  };

  const referralStatusChange = (targetedElem, encounterInfo) => {
    const tempEncList = cloneDeep(encountersList);
    if (!encounterInfo.referralStatusObs) {
      postReferralStatusChangeObs(
        targetedElem.uuid,
        encounterInfo,
        config.referralStatusConceptUUID,
        config.healthCenterAttrTypeUUID,
      ).then((response) => {
        if (response.ok) {
          const encIndex = tempEncList.findIndex((enc) => enc.encounterUuid == encounterInfo.encounterUuid);
          tempEncList[encIndex].referralStatusObs = targetedElem.display;
          tempEncList[encIndex].referralStatusObsUuid = response.data.uuid;
          setEncountersList(tempEncList);
        } else {
          setEncountersList(tempEncList);
          //Need error message
        }
      });
    } else {
      updateReferralStatusChangeObs(
        targetedElem,
        encounterInfo,
        config.referralStatusConceptUUID,
        config.healthCenterAttrTypeUUID,
      ).then((response) => {
        if (response.ok) {
          const encIndex = tempEncList.findIndex((enc) => enc.encounterUuid == encounterInfo.encounterUuid);
          tempEncList[encIndex].referralStatusObs = targetedElem.display;
          tempEncList[encIndex].referralStatusObsUuid = response.data.uuid;
          setEncountersList(tempEncList);
        } else {
          setEncountersList(tempEncList);
          //Need error message
        }
      });
    }
  };

  return (
    <div>
      <div className={styles.filtersContainer}>
        <label htmlFor="sending-hospital">Sending Hospital </label>
        <select
          id="sending-hospital"
          className={styles.dropdown}
          value={sendingHospital}
          onChange={(e) => setSendingHospital(e.target.value)}>
          <option value=""></option>
          {listOfHospitals.map((loc) =>
            userLocation && userLocation !== config.pathologyFullAllowedLocationUUID ? (
              loc.uuid === userLocation ? (
                <option value={loc.display} key={loc.uuid}>
                  {loc.display}
                </option>
              ) : null
            ) : (
              <option value={loc.display} key={loc.uuid}>
                {loc.display}
              </option>
            ),
          )}
        </select>
        <label htmlFor="sample-status">Sample Status </label>
        <select
          id="sample-status"
          className={styles.dropdown}
          value={sampleStatus}
          onChange={(e) => setSampleStatus(e.target.value)}>
          <option value=""></option>
          {sampleStatusAnswers.map((ans) => (
            <option value={ans.display} key={ans.uuid}>
              {ans.display}
            </option>
          ))}
        </select>
        <label htmlFor="referral-status">Plan Status </label>
        <select
          id="referral-status"
          className={styles.dropdown}
          value={referralStatus}
          onChange={(e) => setReferralStatus(e.target.value)}>
          <option value=""></option>
          {referralStatusAnswers.map((ans) => (
            <option value={ans.display} key={ans.uuid}>
              {ans.display}
            </option>
          ))}
        </select>

        <label htmlFor="patient-name">Patient Name </label>
        <input
          id="patient-name"
          className={styles.textBox}
          type="text"
          onChange={(e) => setPatientName(e.target.value)}
        />
      </div>
      <div className={styles.tableContainer}>
        <DataTable rows={currentPageData} headers={headers}>
          {({ rows, headers, getHeaderProps, getTableProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
        <Pagination
          totalItems={rows.length}
          backwardText="Previous page"
          forwardText="Next page"
          itemsPerPageText="Items per page:"
          page={currentPage}
          pagesUnknown={false}
          pageNumberText="Page Number"
          pageSize={itemsPerPage}
          pageSizes={[10, 20, 30, 40, 50]}
          onChange={onPageChange}
        />
        {/* <div style={{width: '800px'}}>

      </div> */}
      </div>
      <div></div>
    </div>
  );
};

export default ReportComponent;
