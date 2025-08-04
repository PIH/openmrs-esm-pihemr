/**
 * This is the root test for this page. It simply checks that the page
 * renders. If the components of your page are highly interdependent,
 * (e.g., if the `Hello` component had state that communicated
 * information between `Greeter` and `PatientGetter`) then you might
 * want to do most of your testing here. If those components are
 * instead quite independent (as is the case in this example), then
 * it would make more sense to test those components independently.
 *
 * The key thing to remember, always, is: write tests that behave like
 * users. They should *look* for elements by their visual
 * characteristics, *interact* with them, and (mostly) *assert* based
 * on things that would be visually apparent to a user.
 *
 * To learn more about how we do testing, see the following resources:
 *   https://kentcdodds.com/blog/how-to-know-what-to-test
 *   https://kentcdodds.com/blog/testing-implementation-details
 *   https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
 *
 * Kent C. Dodds is the inventor of `@testing-library`:
 *   https://testing-library.com/docs/guiding-principles
 */
import React from "react";
import useSWR from "swr";
import { render, cleanup, screen } from "@testing-library/react";
import PatientStatusWidget from "./patient-status-widget";
import { chooseNextVisitDateObs } from "./patient-status-widget.resource";
import {
  mockProgramEnrollmentWithDiagnosisData,
  mockStageObsData,
  mockTreatmentPlanObsData,
} from "./resource.mocks";
import { useConfig } from "@openmrs/esm-framework";

jest.mock("swr");

const mockUseSWR = useSWR as jest.Mock;
const mockUseConfig = useConfig as jest.Mock;
mockUseConfig.mockReturnValue({
  diagnosisWorkflowConceptUuid: "226ed7ad-b776-4b99-966d-fd818d3302c2",
  oncologyProgramName: "Oncology Program",
  stageConceptUuid: "e9cf4aed-34be-4c0a-9004-4294d9bb2d74",
  treatmentPlanConceptUuid: "3cda0160-26fe-102b-80cb-0017a47871b2",
  nextVisitConceptUuids: ["abcd", "abcd", "abcd", "abcd"],
});

function getMockSWRReturnValue(value) {
  return {
    data: { data: value },
    error: null,
    isValidating: false,
  };
}

const emptySWRResponse = getMockSWRReturnValue({ results: [] });

describe(`<PatientStatusWidget />`, () => {
  afterEach(cleanup);

  it(`renders without dying`, () => {
    mockUseSWR.mockReturnValue(emptySWRResponse);

    render(<PatientStatusWidget patientUuid="abc" />);
    screen.findByText(/status/i);
  });

  it(`renders a diagnosis, stage, and treatment plan`, async () => {
    mockUseSWR.mockImplementation((url) => {
      if (/programenrollment/.test(url)) {
        return getMockSWRReturnValue(mockProgramEnrollmentWithDiagnosisData);
      }
      if (/concept=e9cf4aed-34be-4c0a-9004-4294d9bb2d74/.test(url)) {
        return getMockSWRReturnValue(mockStageObsData);
      }
      if (/concept=3cda0160-26fe-102b-80cb-0017a47871b2/.test(url)) {
        return getMockSWRReturnValue(mockTreatmentPlanObsData);
      }
      return emptySWRResponse;
    });
    render(<PatientStatusWidget patientUuid="abc" />);
    const diagnosisTitle = await screen.findByText("Diagnosis");
    const diagnosisDiv = diagnosisTitle.closest("div");
    expect(diagnosisDiv).toHaveTextContent(/Anal Carcinoma/);

    const stageTitle = await screen.findByText("Stage");
    const stageDiv = stageTitle.closest("div");
    expect(stageDiv).toHaveTextContent(/Overall cancer stage one A/);

    const treatmentPlanTitle = await screen.findByText("DST Plan");
    const treatmentPlanDiv = treatmentPlanTitle.closest("div");
    expect(treatmentPlanDiv).toHaveTextContent(/sajd askd asda sadlll/);
  });
});

describe("chooseNextVisitDateObs", () => {
  it("should choose the next future date", () => {
    const today = new Date();
    const twoDaysFromNow = incrementDate(today, 2).toISOString();
    const testDateObs = [3, 20, -10, -100, 2].map((n) =>
      mockFhirDatetimeObs(n, today)
    );
    const result = chooseNextVisitDateObs(testDateObs);
    expect(result.resource.valueDateTime).toBe(twoDaysFromNow);
  });

  it("should choose the most recent past date when there is no future date", () => {
    const today = new Date();
    const fourDaysAgo = incrementDate(today, -4).toISOString();
    const testDateObs = [-100, -4, -20, -50].map((n) =>
      mockFhirDatetimeObs(n, today)
    );
    const result = chooseNextVisitDateObs(testDateObs);
    expect(result.resource.valueDateTime).toBe(fourDaysAgo);
  });
});

function mockFhirDatetimeObs(dayIncrement: number, today: Date) {
  return {
    resource: {
      code: {
        text: "foo",
      },
      valueDateTime: incrementDate(today, dayIncrement).toISOString(),
    },
  };
}

function incrementDate(date: Date, increment: number) {
  const newDate = new Date(date);
  return new Date(newDate.setDate(newDate.getDate() + increment));
}
