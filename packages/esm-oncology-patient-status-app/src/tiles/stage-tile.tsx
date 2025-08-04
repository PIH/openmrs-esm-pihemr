import React from "react";
import { InlineLoading, Tile } from "@carbon/react";
import { ValueTile } from "../value-tile";
import { useStage } from "../patient-status-widget.resource";

interface stageTileProps {
  patientUuid: string;
}

export function StageTile({ patientUuid }: stageTileProps) {
  const { stage, isError, isLoading, isValidating } = useStage(patientUuid);

  return (
    <Tile light>
      <ValueTile label="Stage">
        {isLoading ? <InlineLoading /> : null}
        {isValidating ? <InlineLoading /> : null}
        {isError ? "Error" : null}
        {!isLoading ? stage ?? "—" : null}
      </ValueTile>
    </Tile>
  );
}
