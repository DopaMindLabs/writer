import { useState } from 'react';
import { TextField } from '@/components/ui/TextField';

export const URL_PLACEHOLDER = 'https://arxiv.org/pdf/…';
export const URL_HINT = 'paste an https:// PDF URL';

interface PdfCardUrlInputProps {
  initialValue: string;
  busy: boolean;
  onSubmit: (next: string) => void;
  onCancel?: () => void;
  testIdPrefix: string;
}

interface UrlInputRowProps {
  inputId: string;
  hintId: string;
  value: string;
  setValue: (v: string) => void;
  busy: boolean;
  onCancel?: () => void;
  testIdPrefix: string;
}

const UrlInputRow = ({
  inputId,
  hintId,
  value,
  setValue,
  busy,
  onCancel,
  testIdPrefix,
}: UrlInputRowProps) => (
  <div className="flex items-center gap-1">
    <TextField
      id={inputId}
      aria-describedby={hintId}
      value={value}
      onChange={(e) => { setValue(e.target.value); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onCancel) {
          e.preventDefault();
          onCancel();
        }
      }}
      disabled={busy}
      placeholder={URL_PLACEHOLDER}
      data-testid={`${testIdPrefix}-field`}
      className="font-sans text-[12px]"
    />
    <button
      type="submit"
      disabled={busy || value.trim().length === 0}
      data-testid={`${testIdPrefix}-submit`}
      className="border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:text-ink-4"
    >
      {busy ? 'fetching' : 'fetch'}
    </button>
  </div>
);

export const PdfCardUrlInput = ({
  initialValue,
  busy,
  onSubmit,
  onCancel,
  testIdPrefix,
}: PdfCardUrlInputProps) => {
  const [value, setValue] = useState(initialValue);
  const inputId = `${testIdPrefix}-input`;
  const hintId = `${testIdPrefix}-hint`;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(value.trim()); }}
      onPointerDown={(e) => { e.stopPropagation(); }}
      data-no-drag
      className="flex flex-col gap-1"
    >
      <label
        htmlFor={inputId}
        className="font-mono text-[9px] uppercase tracking-wider text-ink-3"
      >
        PDF URL
      </label>
      <UrlInputRow
        inputId={inputId}
        hintId={hintId}
        value={value}
        setValue={setValue}
        busy={busy}
        onCancel={onCancel}
        testIdPrefix={testIdPrefix}
      />
      <span id={hintId} className="font-sans text-[11px] text-ink-4">
        {URL_HINT}
      </span>
    </form>
  );
};
