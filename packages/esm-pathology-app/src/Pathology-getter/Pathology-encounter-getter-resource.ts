import { openmrsFetch } from '@openmrs/esm-framework';

async function getEncounter(encounterUUID) {
  const searchEncounters = await openmrsFetch(`/ws/rest/v1/encounter/${encounterUUID}`, {
    method: 'GET',
  });
  // const data = await searchPatientEncounters.json();
  // console.log("------------------" + data);
  return searchEncounters;
}

export default getEncounter;
