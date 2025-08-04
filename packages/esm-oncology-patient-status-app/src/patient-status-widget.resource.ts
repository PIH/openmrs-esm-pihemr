import {
  openmrsFetch,
  fhirBaseUrl,
  parseDate,
  useConfig,
} from "@openmrs/esm-framework";
import useSWR from "swr";
import { PatientStatusWidgetConfig } from "./config-schema";

interface PatientProgramStateResponse {
  results: Array<{
    program: {
      name: string;
      allWorkflows: Array<{
        concept: {
          uuid: string;
          display: string;
        };
        retired: boolean;
        states: Array<{
          concept: {
            uuid: string;
          };
          retired: boolean;
        }>;
      }>;
    };
    states: Array<{
      endDate: string | null;
      state: {
        concept: {
          uuid: string;
          display: string;
        };
        retired: boolean;
      };
      voided: boolean;
    }>;
    voided: boolean;
  }>;
}

export function useDiagnosis(patientUuid: string) {
  const config = useConfig() as PatientStatusWidgetConfig;
  const apiUrl = `/ws/rest/v1/programenrollment?patient=${patientUuid}&v=full`;
  const { data, error, isValidating } = useSWR<
    { data: PatientProgramStateResponse },
    Error
  >(apiUrl, openmrsFetch);

  // The diagnosis is kept in the program workflow state for the Oncology Program
  // for the DIAGNOSIS workflow. Unfortunately, the REST API won't simply tell us
  // what state a patient is in for a given workflow. It provides information about
  // all available workflows and all available states for a program; and it provides
  // a list of states that the patient is in. But those states do NOT tell us which
  // workflow they correspond to. So we compare the currently enrolled state to the
  // list of possible states for the workflow we need.
  let diagnosis: string | null = null;
  const oncologyEnrollment = data?.data.results.filter(
    (enrollment) =>
      !enrollment.voided &&
      enrollment.program.name == config.oncologyProgramName
  )[0];
  if (oncologyEnrollment) {
    const diagnosisWorkflow = oncologyEnrollment.program.allWorkflows.filter(
      (workflow) =>
        !workflow.retired &&
        workflow.concept.uuid == config.diagnosisWorkflowConceptUuid
    )[0];
    const diagnosisStateConceptUuids = diagnosisWorkflow.states
      .filter((state) => !state.retired)
      .map((state) => state.concept.uuid);
    const diagnosisState = oncologyEnrollment.states.filter(
      (state) =>
        !state.voided &&
        !state.state.retired &&
        !state.endDate &&
        diagnosisStateConceptUuids.includes(state.state.concept.uuid)
    )[0];
    diagnosis = diagnosisState?.state.concept.display;
  }

  return {
    diagnosis,
    isError: error,
    isLoading: !data && !error,
    isValidating,
  };
}

// Obs
interface RESTObsResponse {
  results: Array<{
    display: string;
    voided: boolean;
    value: CodedObsValue | TextObsValue;
  }>;
}

type CodedObsValue = {
  display: string;
};

type TextObsValue = string;

// Obs with FHIR2
interface FHIRObsResponse {
  entry: Array<FHIRObsDatetime>;
}

interface FHIRObsDatetime {
  resource: {
    code: {
      text: string;
    };
    valueDateTime: string;
  };
}

function useObs(patientUuid: string, conceptUuid: string) {
  const apiUrl = `/ws/rest/v1/obs?patient=${patientUuid}&concept=${conceptUuid}&v=full&limit=1`;
  const { data, error, isValidating } = useSWR<
    { data: RESTObsResponse },
    Error
  >(apiUrl, openmrsFetch);

  const obsSelected = data?.data.results.filter(
    (observation) => !observation.voided
  )[0];

  const obsValue =
    typeof obsSelected?.value == "string"
      ? obsSelected?.value
      : obsSelected?.value.display;
  return {
    obsValue,
    isError: error,
    isLoading: !data && !error,
    isValidating,
  };
}

export function useStage(patientUuid: string) {
  const config = useConfig() as PatientStatusWidgetConfig;

  const obsResponse = useObs(patientUuid, config.stageConceptUuid);

  return {
    stage: obsResponse.obsValue,
    ...obsResponse,
  };
}

export function useTreatmentPlan(patientUuid: string) {
  const config = useConfig() as PatientStatusWidgetConfig;
  const obsResponse = useObs(patientUuid, config.treatmentPlanConceptUuid);

  return {
    treatmentPlan: obsResponse.obsValue,
    ...obsResponse,
  };
}

//Use obs with FHIR2
export function useNextVisit(patientUuid: string) {
  const config = useConfig() as PatientStatusWidgetConfig;
  const apiUrl = `${fhirBaseUrl}/Observation?subject:Patient=${patientUuid}&code=${config.nextVisitConceptUuids.join(
    ","
  )}`;

  const { data, error, isValidating } = useSWR<
    { data: FHIRObsResponse },
    Error
  >(apiUrl, openmrsFetch);

  const chosenObs = data?.data.entry
    ? chooseNextVisitDateObs(data.data.entry)
    : null;

  return {
    conceptName: chosenObs?.resource.code.text,
    nextVisitDate: chosenObs
      ? parseDate(chosenObs.resource.valueDateTime)
      : null,
    isError: error,
    isLoading: !data && !error,
    isValidating,
  };
}

export function chooseNextVisitDateObs(visitDateObs: Array<FHIRObsDatetime>) {
  return visitDateObs.reduce(
    (previousObs: FHIRObsDatetime, currentObs: FHIRObsDatetime) => {
      if (!previousObs) {
        return currentObs;
      }
      const previousDate = parseDate(previousObs.resource.valueDateTime);
      const currentDate = parseDate(currentObs.resource.valueDateTime);

      if (currentDate >= new Date() && currentDate <= previousDate) {
        return currentObs;
      }

      if (
        previousDate <= new Date() &&
        currentDate <= new Date() &&
        currentDate >= previousDate
      ) {
        return currentObs;
      }
      return previousObs;
    },
    null
  );
}
