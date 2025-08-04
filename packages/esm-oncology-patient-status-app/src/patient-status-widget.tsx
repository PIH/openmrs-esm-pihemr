import React from "react";
import { CardHeader } from "./cards";
import styles from "./patient-status-widget.scss";
import { DiagnosisTile } from "./tiles/diagnosis-tile";
import { StageTile } from "./tiles/stage-tile";
import { TreatmentPlanTile } from "./tiles/treatment-plan-tile";
import { NextVisitTile } from "./tiles/next-visit-tile";

interface PatientDashboardWidgetProps {
  patientUuid: string;
}

function PatientStatusWidget({ patientUuid }: PatientDashboardWidgetProps) {
  return (
    <div className={styles.widgetCard}>
      <CardHeader title="Patient status">{null}</CardHeader>

      <table width="100%">
        <tr>
          <td>
            <DiagnosisTile patientUuid={patientUuid} />
          </td>
          <td>
            <StageTile patientUuid={patientUuid} />
          </td>
          <td>
            <TreatmentPlanTile patientUuid={patientUuid} />
          </td>
          <td>
            <NextVisitTile patientUuid={patientUuid} />
          </td>
        </tr>
      </table>
    </div>
  );
}

export default PatientStatusWidget;
