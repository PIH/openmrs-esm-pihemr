import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from '@carbon/react';
import { restBaseUrl, useConfig, useOpenmrsFetchAll, usePagination, usePatient } from '@openmrs/esm-framework';
import { Pagination, NumericObservation } from '@openmrs/esm-styleguide';
import {
  useConceptReferenceRanges,
  calculateInterpretation,
  type ObservationInterpretation,
} from '../hooks/useConceptReferenceRanges';
import dayjs from 'dayjs';

interface VitalsTableProps {
  patientUuid: string;
  visitUuid: string;
}

interface Observation {
  uuid: string;
  concept: {
    uuid: string;
    name: {
      display: string;
    };
  };
  value: number | string | object | null;
}

interface EncounterProvider {
  provider: {
    person: {
      display: string;
    };
  };
}

interface Encounter {
  uuid: string;
  display: string;
  encounterDatetime: string;
  encounterProviders?: EncounterProvider[];
  obs: Observation[];
}

interface EncounterResponse {
  results: Encounter[];
}

const customRepresentation =
  'custom:(uuid,display,encounterDatetime,encounterProviders:(provider:(person:(display))),obs:(uuid,concept:(uuid,name:(display)),value))';

const VitalsTable: React.FC<VitalsTableProps> = ({ patientUuid, visitUuid }) => {
  const { concepts: externalConcepts } = useConfig<{ concepts: Record<string, string> }>({
    externalModuleName: '@openmrs/esm-patient-vitals-app',
  });
  const { concepts: localConcepts } = useConfig<{
    concepts: { hemoglobinUuid: string; glucoseUuid: string; fhrUuid: string; secondFhrUuid: string };
  }>();
  const vitalsConcepts = {
    systolic: externalConcepts.systolicBloodPressureUuid,
    diastolic: externalConcepts.diastolicBloodPressureUuid,
    pulse: externalConcepts.pulseUuid,
    temperature: externalConcepts.temperatureUuid,
    oxygenSaturation: externalConcepts.oxygenSaturationUuid,
    respiratoryRate: externalConcepts.respiratoryRateUuid,
    hemoglobin: localConcepts.hemoglobinUuid,
    glucose: localConcepts.glucoseUuid,
    fhr: localConcepts.fhrUuid,
    secondFhr: localConcepts.secondFhrUuid,
  };
  const { referenceRangeMap } = useConceptReferenceRanges(patientUuid, Object.values(vitalsConcepts));
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const { patient } = usePatient(patientUuid);

  // Check if patient is less than 30 days old
  const isNewborn = useMemo(() => {
    if (!patient?.birthDate) return false;
    const birthDate = dayjs(patient.birthDate);
    const ageInDays = dayjs().diff(birthDate, 'day');
    return ageInDays < 30;
  }, [patient?.birthDate]);

  const interpretationLabels: Record<ObservationInterpretation, string> = {
    normal: t('normal', 'Normal'),
    high: t('high', 'High'),
    critically_high: t('criticallyHigh', 'Critically high'),
    off_scale_high: t('offScaleHigh', 'Off scale high'),
    low: t('low', 'Low'),
    critically_low: t('criticallyLow', 'Critically low'),
    off_scale_low: t('offScaleLow', 'Off scale low'),
  };

  interface VitalCellData {
    value: number | string | object | null;
    interpretation?: ObservationInterpretation;
    conceptUuid?: string;
  }

  interface VitalRowData {
    id: string;
    date: string;
    bp: { systolic?: VitalCellData; diastolic?: VitalCellData };
    pulse?: VitalCellData;
    temperature?: VitalCellData;
    oxygenSaturation?: VitalCellData;
    respiratoryRate?: VitalCellData;
    hemoglobin?: VitalCellData;
    glucose?: VitalCellData;
    fhr?: VitalCellData;
    secondFhr?: VitalCellData;
    provider?: string;
  }

  type VitalColumnKey = Exclude<keyof VitalRowData, 'id' | 'date' | 'provider'>;

  const createVitalCellData = (value: number | string | object | null, conceptUuid?: string): VitalCellData => {
    if (value === null || value === undefined) {
      return { value: null };
    }

    const numericValue = typeof value === 'object' ? undefined : value;
    const interpretation = conceptUuid
      ? calculateInterpretation(numericValue, referenceRangeMap[conceptUuid])
      : undefined;

    return {
      value,
      interpretation,
      conceptUuid,
    };
  };

  const vitalColumns: Array<{ key: VitalColumnKey; label: string; conceptUuid?: string }> = useMemo(() => {
    let columns = [
      { key: 'bp', label: t('bloodPressure', 'BP') },
      { key: 'pulse', label: t('pulse', 'HR'), conceptUuid: vitalsConcepts.pulse },
      { key: 'temperature', label: t('temperature', 'Temp'), conceptUuid: vitalsConcepts.temperature },
      { key: 'respiratoryRate', label: t('respiratoryRate', 'RR'), conceptUuid: vitalsConcepts.respiratoryRate },
      { key: 'oxygenSaturation', label: t('oxygenSaturation', 'O2 Sat'), conceptUuid: vitalsConcepts.oxygenSaturation },
      { key: 'glucose', label: t('glucose', 'Glucose'), conceptUuid: vitalsConcepts.glucose },
    ] as Array<{ key: VitalColumnKey; label: string; conceptUuid?: string }>;

    // Only include hemoglobin, fhr, and secondFhr for patients 30 days or older
    if (!isNewborn) {
      columns.push(
        { key: 'hemoglobin', label: t('hemoglobin', 'Hb'), conceptUuid: vitalsConcepts.hemoglobin },
        { key: 'fhr', label: t('fetalHeartRate', 'FHR'), conceptUuid: vitalsConcepts.fhr },
        { key: 'secondFhr', label: t('secondFetalHeartRate', '2nd FHR'), conceptUuid: vitalsConcepts.secondFhr },
      );
    }

    return columns;
  }, [isNewborn, vitalsConcepts, t]);

  const renderVitalCell = (
    cellData: VitalCellData | { systolic?: VitalCellData; diastolic?: VitalCellData } | undefined,
  ) => {
    if (!cellData) {
      return <span>—</span>;
    }

    // Handle BP which is an object with systolic and diastolic
    if ('systolic' in cellData) {
      const bpData = cellData as { systolic?: VitalCellData; diastolic?: VitalCellData };
      return (
        <div style={{ display: 'flex', gap: '0', alignItems: 'center' }}>
          {bpData.systolic && (
            <NumericObservation
              value={
                bpData.systolic.value !== null && bpData.systolic.value !== undefined
                  ? String(bpData.systolic.value)
                  : ''
              }
              interpretation={bpData.systolic.interpretation}
              conceptUuid={bpData.systolic.conceptUuid}
              variant="cell"
              patientUuid={patientUuid}
            />
          )}
          <span style={{ margin: '0 -0.25rem' }}>/</span>
          {bpData.diastolic && (
            <NumericObservation
              value={
                bpData.diastolic.value !== null && bpData.diastolic.value !== undefined
                  ? String(bpData.diastolic.value)
                  : ''
              }
              interpretation={bpData.diastolic.interpretation}
              conceptUuid={bpData.diastolic.conceptUuid}
              variant="cell"
              patientUuid={patientUuid}
            />
          )}
        </div>
      );
    }

    // Handle regular vitals
    const vitalData = cellData as VitalCellData;
    if (vitalData.value === null || vitalData.value === undefined) {
      return <span>—</span>;
    }

    return (
      <NumericObservation
        value={String(vitalData.value)}
        interpretation={vitalData.interpretation}
        conceptUuid={vitalData.conceptUuid}
        variant="cell"
        patientUuid={patientUuid}
      />
    );
  };

  const createRowData = (encounter: Encounter): VitalRowData => {
    const vitalsMap = encounter.obs.reduce(
      (acc, obs) => {
        acc[obs.concept.uuid] = obs.value;
        return acc;
      },
      {} as Record<string, number | string | object | null>,
    );

    const providerName = encounter.encounterProviders?.[0]?.provider?.person?.display || '—';

    return {
      id: encounter.uuid,
      date: dayjs(encounter.encounterDatetime).format('DD/MM/YYYY HH:mm'),
      bp: {
        systolic: createVitalCellData(vitalsMap[vitalsConcepts.systolic], vitalsConcepts.systolic),
        diastolic: createVitalCellData(vitalsMap[vitalsConcepts.diastolic], vitalsConcepts.diastolic),
      },
      pulse: createVitalCellData(vitalsMap[vitalsConcepts.pulse], vitalsConcepts.pulse),
      temperature: createVitalCellData(vitalsMap[vitalsConcepts.temperature], vitalsConcepts.temperature),
      oxygenSaturation: createVitalCellData(
        vitalsMap[vitalsConcepts.oxygenSaturation],
        vitalsConcepts.oxygenSaturation,
      ),
      respiratoryRate: createVitalCellData(vitalsMap[vitalsConcepts.respiratoryRate], vitalsConcepts.respiratoryRate),
      hemoglobin: createVitalCellData(vitalsMap[vitalsConcepts.hemoglobin]),
      glucose: createVitalCellData(vitalsMap[vitalsConcepts.glucose]),
      fhr: createVitalCellData(vitalsMap[vitalsConcepts.fhr], vitalsConcepts.fhr),
      secondFhr: createVitalCellData(vitalsMap[vitalsConcepts.secondFhr], vitalsConcepts.secondFhr),
      provider: providerName,
    };
  };

  const { data: vitalsData, error } = useOpenmrsFetchAll<Encounter>(
    `${restBaseUrl}/encounter?patient=${patientUuid}&visit=${visitUuid}&order=desc&v=${customRepresentation}`,
  );

  const encounters: Encounter[] = vitalsData || [];

  // Filter encounters to only include those with vitals observations
  const encountersWithVitals = encounters.filter((encounter) => {
    return encounter.obs.some((obs) => Object.values(vitalsConcepts).includes(obs.concept.uuid));
  });

  // Process each encounter to extract vital signs
  const tableRows = useMemo(
    () => encountersWithVitals.map(createRowData),
    [encountersWithVitals, vitalsConcepts, referenceRangeMap],
  );

  const pageSize = 5;
  const { results: paginatedVitals, currentPage, goTo } = usePagination(tableRows, pageSize);

  const displayedRows = showAll ? tableRows : paginatedVitals;

  if (error) {
    return <div>{t('errorLoadingVitals', 'Error loading vitals')}</div>;
  }

  if (!vitalsData) {
    return <div>{t('loadingVitals', 'Loading vitals...')}</div>;
  }

  const tableHeaders = [
    { key: 'date', header: t('date', 'Date') },
    ...vitalColumns.map((col) => ({ key: col.key, header: col.label })),
    { key: 'provider', header: t('provider', 'Provider') },
  ];

  return (
    <>
      <DataTable headers={tableHeaders} rows={displayedRows} size="sm" useZebraStyles>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const rowData = displayedRows.find((r) => r.id === row.id) as VitalRowData | undefined;

                  return (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => {
                        if (cell.info.header === 'date' || cell.info.header === 'provider') {
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        }

                        const columnKey = cell.info.header as VitalColumnKey;
                        const cellValue = rowData?.[columnKey];

                        return (
                          <TableCell key={cell.id} style={{ padding: 0 }}>
                            {renderVitalCell(cellValue)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>
            {displayedRows.length} / {tableRows.length} {t('items', 'items')}
          </span>
          <Button kind="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? t('showPaginated', 'Show Paginated') : t('showAll', 'Show All')}
          </Button>
        </div>
        {!showAll && (
          <Pagination
            pageNumber={currentPage}
            totalItems={tableRows.length}
            currentItems={paginatedVitals.length}
            pageSize={pageSize}
            onPageNumberChange={({ page }) => goTo(page)}
          />
        )}
      </div>
    </>
  );
};

export default VitalsTable;
