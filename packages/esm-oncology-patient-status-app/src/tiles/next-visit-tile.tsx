import React from "react";
import { InlineLoading, Tile } from "@carbon/react";
import { ValueTile } from "../value-tile";
import { useNextVisit } from "../patient-status-widget.resource";
import { formatDate } from "@openmrs/esm-framework";

interface nextVisitTileProps {
  patientUuid: string;
}

export function NextVisitTile({ patientUuid }: nextVisitTileProps) {
  const { nextVisitDate, conceptName, isError, isLoading, isValidating } =
    useNextVisit(patientUuid);

  return (
    <Tile light>
      <ValueTile label={conceptName ?? "Next visit Date"}>
        {isLoading ? <InlineLoading /> : null}
        {isValidating ? <InlineLoading /> : null}
        {isError ? "Error" : null}
        {!isLoading && nextVisitDate
          ? formatDate(nextVisitDate, { time: false }) ?? "—"
          : null}
      </ValueTile>
    </Tile>
  );
}
