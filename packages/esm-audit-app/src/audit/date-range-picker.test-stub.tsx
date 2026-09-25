import React, { useState } from 'react';
import { OpenmrsDateRangePicker, type OpenmrsDateRangePickerProps } from '@openmrs/esm-framework';

/** Reads `MM/DD/YYYY` into something shaped like the react-aria dates the real picker reports. */
function parsePickerDate(text: string | undefined) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text?.trim() ?? '');
  if (!match) {
    return null;
  }
  const [, month, day, year] = match.map(Number);
  return { toDate: () => new Date(year, month - 1, day) };
}

/**
 * Stands in for `OpenmrsDateRangePicker` the way the real one behaves, which the framework's own
 * mock does not: react-aria reports the range through `onChangeRaw`, and reports `null` on every
 * change until both ends are complete. Type the range as `MM/DD/YYYY–MM/DD/YYYY`.
 */
export function stubDateRangePicker() {
  jest
    .mocked(OpenmrsDateRangePicker)
    .mockImplementation(({ id, labelText, onChangeRaw }: OpenmrsDateRangePickerProps) => {
      const [text, setText] = useState('');
      return (
        <div>
          <label htmlFor={id}>{labelText}</label>
          <input
            id={id}
            onChange={(event) => {
              setText(event.target.value);
              const [start, end] = event.target.value.split('–').map(parsePickerDate);
              onChangeRaw?.(start && end ? ({ start, end } as never) : null);
            }}
            type="text"
            value={text}
          />
        </div>
      );
    });
}
