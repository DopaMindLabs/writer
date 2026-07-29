import type { ChangeEvent } from 'react';
import { TextField } from '@/components/ui/TextField';

export interface SecretFieldProps {
  label: string;
  value: string;
  onValue: (value: string) => void;
  type?: 'password' | 'text';
  error?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  'data-testid'?: string;
}

/** A labelled password/text field used by the passphrase and recovery forms. */
export const SecretField = ({
  label,
  value,
  onValue,
  type = 'password',
  error,
  placeholder,
  autoFocus,
  'data-testid': testId,
}: SecretFieldProps) => (
  <label className="flex flex-col gap-1 text-[13px] text-ink-2">
    {label}
    <TextField
      type={type}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      error={error}
      autoFocus={autoFocus}
      data-testid={testId}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        onValue(e.target.value);
      }}
    />
  </label>
);
