import React from "react";
import { InlineLoading, Tile } from "@carbon/react";
import { ValueTile } from "../value-tile";
import { useDiagnosis } from "../patient-status-widget.resource";

interface DiagnosisTileProps {
  patientUuid: string;
}

export function DiagnosisTile({ patientUuid }: DiagnosisTileProps) {
  const { diagnosis, isError, isLoading, isValidating } =
    useDiagnosis(patientUuid);

  return (
    <Tile light>
      <ValueTile label="Diagnosis">
        {isLoading ? <InlineLoading /> : null}
        {isValidating ? <InlineLoading /> : null}
        {isError ? "Error" : null}
        {!isLoading ? diagnosis ?? "—" : null}
      </ValueTile>
    </Tile>
  );
}
