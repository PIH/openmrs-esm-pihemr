import React from "react";
import { InlineLoading, Tile } from "@carbon/react";
import { ValueTile } from "../value-tile";
import { useTreatmentPlan } from "../patient-status-widget.resource";

interface treatmentPlanTileProps {
  patientUuid: string;
}

export function TreatmentPlanTile({ patientUuid }: treatmentPlanTileProps) {
  const { treatmentPlan, isError, isLoading, isValidating } =
    useTreatmentPlan(patientUuid);

  return (
    <Tile light>
      <ValueTile label="DST Plan">
        {isLoading ? <InlineLoading /> : null}
        {isValidating ? <InlineLoading /> : null}
        {isError ? "Error" : null}
        {!isLoading ? treatmentPlan ?? "—" : null}
      </ValueTile>
    </Tile>
  );
}
