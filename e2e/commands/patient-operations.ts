import { type Patient } from '@openmrs/esm-framework';
import { type APIRequestContext, expect } from '@playwright/test';
import { KGHEmrIdSourceUuid, KGHEmrIdTypeUuid, motherChildRelationshipTypeUuid } from '../core/constants';

/**
 * Mostly taken from openmrs-esm-patient-management
 */
type PatientProfile = 'adultWomen' | 'adultMen' | 'newborn';

function getPatientInfoFromProfile(profile: PatientProfile) {
  switch (profile) {
    case 'adultWomen':
      return {
        gender: 'F',
        givenName: `Jane${new Date().toISOString()}`,
        familyName: `Doe E2E`,
        birthdate: getRandomBirthday(profile),
      };
    case 'adultMen':
      return {
        gender: 'M',
        givenName: `John${new Date().toISOString()}`,
        familyName: `Doe E2E`,
        birthdate: getRandomBirthday(profile),
      };
    case 'newborn':
      return {
        gender: 'F',
        givenName: `Baby${new Date().toISOString()}`,
        familyName: `Doe E2E`,
        birthdate: getRandomBirthday(profile),
      };
    default:
      throw new Error(`Unknown patient profile: ${profile}`);
  }
}

// return a YYYY-MM-DD string base on profile
// adult - 18 to 30 years old
// child - 2 to 17 years old
// baby - 0 to 2 monthts old
function getRandomBirthday(profile: PatientProfile): string {
  const now = new Date();
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const birth = new Date(now);

  if (profile === 'adultWomen' || profile === 'adultMen') {
    // pick an age between 18 and 30 years, plus up to 364 extra days for variety
    const years = randInt(18, 30);
    const extraDays = randInt(0, 364);
    birth.setFullYear(birth.getFullYear() - years);
    birth.setDate(birth.getDate() - extraDays);
  } else if (profile === 'newborn') {
    // baby: 0 to ~60 days old
    const days = randInt(0, 60);
    birth.setDate(birth.getDate() - days);
  } else {
    // pick an age between 2 and 17 years, plus up to 364 extra days for variety
    const years = randInt(2, 17);
    const extraDays = randInt(0, 364);
    birth.setFullYear(birth.getFullYear() - years);
    birth.setDate(birth.getDate() - extraDays);
  }

  const y = birth.getFullYear();
  const m = String(birth.getMonth() + 1).padStart(2, '0');
  const d = String(birth.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const generateRandomPatient = async (
  api: APIRequestContext,
  profile: PatientProfile,
  locationUuid?: string,
): Promise<Patient> => {
  const identifierRes = await api.post(`idgen/identifiersource/${KGHEmrIdSourceUuid}/identifier`, {
    data: {},
  });
  await expect(identifierRes.ok()).toBeTruthy();
  const { identifier } = await identifierRes.json();

  const patientInfo = getPatientInfoFromProfile(profile);

  const patientRes = await api.post('patient', {
    // TODO: This is not configurable right now. It probably should be.
    data: {
      identifiers: [
        {
          identifier,
          identifierType: KGHEmrIdTypeUuid,
          location: locationUuid || process.env.E2E_LOGIN_DEFAULT_LOCATION_UUID,
          preferred: true,
        },
      ],
      person: {
        addresses: [
          {
            address1: 'Sesame Street',
            address2: '',
            cityVillage: 'Kono',
            country: 'Sierra Leone',
            postalCode: '12345',
            stateProvince: 'Koidu',
          },
        ],
        attributes: [],
        birthdate: patientInfo.birthdate,
        birthdateEstimated: false,
        dead: false,
        gender: patientInfo.gender,
        names: [
          {
            familyName: patientInfo.familyName,
            givenName: patientInfo.givenName,
            middleName: '',
            preferred: true,
          },
        ],
      },
    },
  });
  await expect(patientRes.ok()).toBeTruthy();
  return await patientRes.json();
};

export const addMotherChildRelationship = async (api: APIRequestContext, motherUuid: string, childUuid: string) => {
  const relationshipRes = await api.post('relationship', {
    data: {
      personA: motherUuid,
      personB: childUuid,
      relationshipType: motherChildRelationshipTypeUuid,
    },
  });
  await expect(relationshipRes.ok()).toBeTruthy();
};

export const getPatient = async (api: APIRequestContext, uuid: string): Promise<Patient> => {
  const patientRes = await api.get(`patient/${uuid}?v=full`);
  return await patientRes.json();
};

export const deletePatient = async (api: APIRequestContext, uuid: string) => {
  const response = await api.delete(`patient/${uuid}`);
  const text = await response.text();
  await expect(response.ok()).toBeTruthy();
};

export function getPatientIdentifierStr(patient: Patient) {
  return patient.identifiers[0].display.split('=')[1].trim();
}

export function getPatientName(patient: Patient) {
  return patient.person.display;
}
