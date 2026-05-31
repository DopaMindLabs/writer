import { useRef, type ChangeEvent, type ReactNode } from 'react';

export interface FileInputTriggerProps {
  /** Comma-separated `accept` attribute, e.g. "image/png,image/jpeg". */
  accept?: string;
  /** Allow selecting more than one file. */
  multiple?: boolean;
  /** When true the hidden input is disabled and `open()` is a no-op. */
  disabled?: boolean;
  /** Called with the chosen files; the input is reset afterwards so the same
   * file can be picked again. */
  onPick: (files: File[]) => void;
  /** Render prop receiving an `open()` callback to wire to any DS button. */
  children: (open: () => void) => ReactNode;
  'data-testid'?: string;
}

/**
 * Logic-only primitive that owns a hidden `<input type="file">` and exposes an
 * `open()` callback to its render-prop child. Compose it with an existing DS
 * `Button`/`IconButton` rather than styling a bespoke upload control, so every
 * file picker in the app looks like every other action. No visual output of its
 * own beyond the (visually hidden) input.
 */
export const FileInputTrigger = ({
  accept,
  multiple = false,
  disabled = false,
  onPick,
  children,
  'data-testid': testId,
}: FileInputTriggerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length > 0) onPick(files);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        data-testid={testId}
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
      {children(open)}
    </>
  );
};
