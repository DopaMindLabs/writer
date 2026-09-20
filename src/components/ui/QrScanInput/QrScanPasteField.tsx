import { useId, useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { TextField } from '@/components/ui/TextField';

/**
 * Enter a pairing code by hand.
 *
 * The last link in the accessibility chain: this works with nothing but a
 * keyboard, so a user with no camera and no image can still pair. Submitting on
 * Enter matters as much as the button — a pasted code is usually followed by a
 * return key, not a reach for the mouse.
 *
 * The field empties on a successful submit. A payload can span several symbols,
 * and leaving the previous one in place means the next paste lands *after* it,
 * producing a code that is invalid for a reason the user cannot see.
 */

export interface QrScanPasteFieldProps {
  label: string;
  submitLabel: string;
  onScan: (payload: string) => void;
}

export const QrScanPasteField = ({ label, submitLabel, onScan }: QrScanPasteFieldProps) => {
  const fieldId = useId();
  const [typed, setTyped] = useState('');

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    // Copying a code off a screen tends to bring whitespace with it.
    const value = typed.trim();
    if (value.length === 0) return;
    setTyped('');
    onScan(value);
  };

  return (
    <form className="flex flex-col gap-1" onSubmit={submit}>
      <Label htmlFor={fieldId} tone="ink2">
        {label}
      </Label>
      <div className="flex gap-2">
        <TextField
          id={fieldId}
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};
