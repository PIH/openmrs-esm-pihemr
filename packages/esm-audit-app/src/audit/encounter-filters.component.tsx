import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ComboBox } from '@carbon/react';
import { OpenmrsDateRangePicker } from '@openmrs/esm-framework';
import { type AuditPatient, type OpenmrsResourceRef } from '../types';
import { usePatientEncounterTypes } from './audit.resource';
import { type EncounterFilters, fromDateKey, hasActiveFilters, toDateKey } from './encounter-filters';
import styles from './audit.scss';

interface EncounterFiltersBarProps {
  patient: AuditPatient | undefined;
  includeDeleted: boolean;
  filters: EncounterFilters;
  onChange(filters: EncounterFilters): void;
}

/**
 * Narrows a patient's encounter list by encounter type and by the date the encounter happened.
 * The types on offer are the ones this patient's encounters actually use.
 */
export default function EncounterFiltersBar({ patient, includeDeleted, filters, onChange }: EncounterFiltersBarProps) {
  const { t } = useTranslation();
  const { encounterTypes, isLoading } = usePatientEncounterTypes(patient, includeDeleted);

  const today = useMemo(() => new Date(), []);

  /**
   * Hiding deleted encounters again can take the chosen type out of the list. Keeping it on the
   * list means the filter that is in force is still the one shown, and can still be changed.
   */
  const items = useMemo(() => {
    const selected = filters.encounterType;
    if (selected && !encounterTypes.some((encounterType) => encounterType.uuid === selected.uuid)) {
      return [...encounterTypes, selected];
    }
    return encounterTypes;
  }, [encounterTypes, filters.encounterType]);

  const dateRange = useMemo<[Date | null, Date | null]>(
    () => [fromDateKey(filters.fromDate), fromDateKey(filters.toDate)],
    [filters.fromDate, filters.toDate],
  );

  return (
    <div className={styles.filters}>
      <ComboBox
        className={styles.filterControl}
        disabled={isLoading || items.length === 0}
        id="encounter-type-filter"
        items={items}
        itemToString={(encounterType: OpenmrsResourceRef | null) => encounterType?.display ?? ''}
        onChange={({ selectedItem }: { selectedItem: OpenmrsResourceRef | null }) =>
          onChange({ ...filters, encounterType: selectedItem ?? undefined })
        }
        placeholder={t('allEncounterTypes', 'All encounter types')}
        selectedItem={filters.encounterType ?? null}
        size="sm"
        titleText={t('encounterType', 'Encounter type')}
      />
      <OpenmrsDateRangePicker
        className={styles.filterControl}
        labelText={t('encounterDateRange', 'Encounter date range')}
        maxDate={today}
        onChange={([from, to]) => onChange({ ...filters, fromDate: toDateKey(from), toDate: toDateKey(to) })}
        size="sm"
        value={dateRange}
      />
      {hasActiveFilters(filters) ? (
        <Button className={styles.clearFilters} kind="ghost" onClick={() => onChange({})} size="sm">
          {t('clearFilters', 'Clear filters')}
        </Button>
      ) : null}
    </div>
  );
}
