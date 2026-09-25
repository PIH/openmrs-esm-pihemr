import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ComboBox } from '@carbon/react';
import { OpenmrsDateRangePicker } from '@openmrs/esm-framework';
import { type OpenmrsResourceRef } from '../types';
import { fromPickerRange, toPickerDefault } from './date-range';
import { type EncounterFilters, hasActiveFilters } from './encounter-filters';
import styles from './audit.scss';

interface EncounterFiltersBarProps {
  /**
   * The types to offer. Supplied rather than fetched, because the right set depends on the list
   * being filtered: a patient's own types where they can be known, every type in the system where
   * they cannot.
   */
  encounterTypes: Array<OpenmrsResourceRef>;
  isLoadingTypes: boolean;
  filters: EncounterFilters;
  onChange(filters: EncounterFilters): void;
}

/**
 * Narrows an encounter list by encounter type and by the date the encounter happened.
 */
export default function EncounterFiltersBar({
  encounterTypes,
  isLoadingTypes,
  filters,
  onChange,
}: EncounterFiltersBarProps) {
  const { t } = useTranslation();

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

  // bumped to clear the range picker, which has to be left to hold its own value
  const [datePickerKey, setDatePickerKey] = useState(0);

  return (
    <div className={styles.filters}>
      <ComboBox
        className={styles.filterControl}
        disabled={isLoadingTypes || items.length === 0}
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
        defaultValue={toPickerDefault(filters)}
        id="encounter-date-range-filter"
        labelText={t('encounterDateRange', 'Encounter date range')}
        maxDate={today}
        onChangeRaw={(range) => {
          const { fromDate, toDate } = fromPickerRange(range);
          // the picker reports on keystrokes that leave the range as it was, and a new filters object
          // would send the list back to its first page for nothing
          if (fromDate !== filters.fromDate || toDate !== filters.toDate) {
            onChange({ ...filters, fromDate, toDate });
          }
        }}
        key={datePickerKey}
        size="sm"
      />
      {hasActiveFilters(filters) ? (
        <Button
          className={styles.clearFilters}
          kind="ghost"
          onClick={() => {
            setDatePickerKey((key) => key + 1);
            onChange({});
          }}
          size="sm">
          {t('clearFilters', 'Clear filters')}
        </Button>
      ) : null}
    </div>
  );
}
