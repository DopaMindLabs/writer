import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { TextField } from './TextField';

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
  value?: number;
  onChange: (value: number | undefined) => void;
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
