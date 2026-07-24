import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export interface SelectionStripNoteEditorProps {
  /** `bg-hl-*` class for the current colour dot shown in the header. */
  colorSwatchClassName: string;
  /** Preformatted eyebrow, e.g. "P.12 · HIGHLIGHT + NOTE". */
  eyebrow: string;
  placeholder: string;
  /** "ESC CANCELS". */
  cancelHint: string;
  /** "↵ SAVE". */
  saveHint: string;
  initialValue?: string;
  onSave: (note: string) => void;
  /** Escape returns to the plain strip (not full dismissal). */
  onCancel: () => void;
}

/**
 * The note editor the selection strip grows into — the same chassis, taller:
 * a header (current colour dot + mono micro-caps eyebrow), a single-line italic
 * serif input, and a footer of cancel/save hints. `Enter` saves, `Escape`
 * cancels. Focus moves into the input on open. No i18n, no design-system
 * imports: every label is passed in.
 */
export const SelectionStripNoteEditor = ({
  colorSwatchClassName,
  eyebrow,
  placeholder,
  cancelHint,
  saveHint,
  initialValue = '',
  onSave,
  onCancel,
}: SelectionStripNoteEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSave(value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-1" data-testid="pdf-selection-note-editor">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-3.5 w-3.5 rounded-full ${colorSwatchClassName}`}
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-2">
          {eyebrow}
        </span>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        onKeyDown={onKeyDown}
        data-testid="strip-note-input"
        className="min-w-[250px] border-0 border-b border-rule bg-transparent px-0 py-1 font-serif text-sm italic text-ink outline-none"
      />
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-2">
        <span>{cancelHint}</span>
        <span>{saveHint}</span>
      </div>
    </div>
  );
};
