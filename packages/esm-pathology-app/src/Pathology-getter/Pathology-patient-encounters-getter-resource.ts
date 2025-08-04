import { openmrsFetch } from '@openmrs/esm-framework';

async function getPatientEncounters(patientuuid) {
  const searchPatientEncounters = await openmrsFetch(
    '/ws/rest/v1/encounter?patient=c604dabc-2700-102b-80cb-0017a47871b2',
    {
      method: 'GET',
    },
  );
  // const data = await searchPatientEncounters.json();
  // console.log("------------------" + data);
  return searchPatientEncounters;
}

export default getPatientEncounters;
