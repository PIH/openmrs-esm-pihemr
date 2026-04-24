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
import { openmrsFetch, restBaseUrl, useConfig, usePagination } from '@openmrs/esm-framework';
import { Pagination } from '@openmrs/esm-styleguide';
import useSWR from 'swr';
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

interface Encounter {
  uuid: string;
  display: string;
  encounterDatetime: string;
  obs: Observation[];
}

interface EncounterResponse {
  results: Encounter[];
}

const customRepresentation = 'custom:(uuid,display,encounterDatetime,obs:(uuid,concept:(uuid,name:(display)),value))';

const VitalsTable: React.FC<VitalsTableProps> = ({ patientUuid, visitUuid }) => {
  const { concepts: externalConcepts } = useConfig<{ concepts: Record<string, string> }>({
    externalModuleName: '@openmrs/esm-patient-vitals-app',
  });
  const { concepts: localConcepts } = useConfig<{
    concepts: { hemoglobinUuid: string; glucoseUuid: string; fhrUuid: string };
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
  };
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const { data: vitalsData, error } = useSWR<EncounterResponse>(
    `${restBaseUrl}/encounter?patient=${patientUuid}&visit=${visitUuid}&order=desc&v=${customRepresentation}`,
    (url: string) => openmrsFetch(url).then((res) => res.data),
  );

  const encounters: Encounter[] = vitalsData?.results || [];

  // Filter encounters to only include those with vitals observations
  const encountersWithVitals = encounters.filter((encounter) => {
    return encounter.obs.some((obs) => Object.values(vitalsConcepts).includes(obs.concept.uuid));
  });

  // Process each encounter to extract vital signs
  const tableRows = useMemo(
    () =>
      encountersWithVitals.map((encounter) => {
        const vitalsMap = encounter.obs.reduce(
          (acc, obs) => {
            acc[obs.concept.uuid] = obs.value;
            return acc;
          },
          {} as Record<string, number | string | object | null>,
        );

        const systolic = vitalsMap[vitalsConcepts.systolic];
        const diastolic = vitalsMap[vitalsConcepts.diastolic];

        return {
          id: encounter.uuid,
          date: dayjs(encounter.encounterDatetime).format('DD/MM/YYYY HH:mm'),
          bp: systolic && diastolic ? `${systolic}/${diastolic}` : '',
          pulse: vitalsMap[vitalsConcepts.pulse] || '',
          temperature: vitalsMap[vitalsConcepts.temperature] || '',
          oxygenSaturation: vitalsMap[vitalsConcepts.oxygenSaturation] || '',
          respiratoryRate: vitalsMap[vitalsConcepts.respiratoryRate] || '',
          hemoglobin: vitalsMap[vitalsConcepts.hemoglobin] || '',
          glucose: vitalsMap[vitalsConcepts.glucose] || '',
          fhr: vitalsMap[vitalsConcepts.fhr] || '',
        };
      }),
    [encountersWithVitals, vitalsConcepts],
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
    { key: 'bp', header: t('bloodPressure', 'BP') },
    { key: 'pulse', header: t('pulse', 'HR') },
    { key: 'respiratoryRate', header: t('respiratoryRate', 'RR') },
    { key: 'temperature', header: t('temperature', 'Temp') },
    { key: 'oxygenSaturation', header: t('oxygenSaturation', 'O2 Sat') },
    { key: 'hemoglobin', header: t('hemoglobin', 'Hb') },
    { key: 'glucose', header: t('glucose', 'Glucose') },
    { key: 'fhr', header: t('fetalHeartRate', 'FHR') },
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
                {rows.map((row) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
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
