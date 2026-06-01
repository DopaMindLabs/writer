import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { TextField } from './TextField';

// A date input that speaks epoch milliseconds, composed from the TextField
// primitive so it inherits the hairline baseline, disabled and error styling.
// The native <input type="date"> value is a local `yyyy-mm-dd` string; we
// convert to/from epoch ms (local midnight) at the boundary.

const pad = (value: number): string => String(value).padStart(2, '0');

const toInputValue = (ms: number | undefined): string => {
  if (ms === undefined) return '';
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const fromInputValue = (value: string): number | undefined => {
  if (!value) return undefined;
  const parts = value.split('-');
  if (parts.length !== 3) return undefined;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
};

export interface DateFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'min' | 'max' | 'type'
  > {
  /** The selected date as epoch milliseconds, or undefined when empty. */
  value?: number;
  /** Fired with the new date as epoch ms, or undefined when cleared. */
  onChange: (value: number | undefined) => void;
  /** Optional bounds, as epoch milliseconds. */
  min?: number;
  max?: number;
  error?: boolean;
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ value, onChange, min, max, ...rest }, ref) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(fromInputValue(event.target.value));
    };
    return (
      <TextField
        ref={ref}
        type="date"
        value={toInputValue(value)}
        onChange={handleChange}
        min={min !== undefined ? toInputValue(min) : undefined}
        max={max !== undefined ? toInputValue(max) : undefined}
        {...rest}
      />
    );
  },
);
DateField.displayName = 'DateField';
