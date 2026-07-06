import { useRef, useState } from 'react';
import { SelectionStripNoteEditor } from './SelectionStripNoteEditor';
import { SelectionStripRoster } from './SelectionStripRoster';
import { useStripPosition, useStripDismissal } from './useStripChrome';
import type { StripColor, SelectionStripLabels } from './stripLabels';
import type { SelectionCapture } from '../core/types';

// Chassis copied from src/editor/plugins/FloatingToolbar.tsx (hard ban on
// importing from src/editor/**). Keep this class string in sync with that file —
// the design requires the reader strip to be the same chassis.
const CHASSIS = 'absolute z-50 rounded-sm border border-rule bg-paper shadow-md';

export interface SelectionStripProps {
  capture: SelectionCapture;
  /** The `[data-page-number]` wrapper (position: relative) the strip lives in. */
  pageEl: HTMLElement;
  colors: StripColor[];
  currentColorId: string;
  labels: SelectionStripLabels;
  onPickColor: (id: string) => void;
  onUnderline: () => void;
  onStrikethrough: () => void;
  onSaveNote: (note: string) => void;
  /** Optional: the app omits cite when no programmatic citation entry exists. */
  onCite?: () => void;
  onDismiss: () => void;
}

/**
 * The floating selection strip — the editor FloatingToolbar chassis, reader
 * flavour. The `note` action grows the same positioned container into a note
 * editor. The strip renders invisibly for one layout pass to measure itself,
 * then positions against the page box. No portals — it scrolls with the page.
 */
export const SelectionStrip = ({
  capture,
  pageEl,
  colors,
  currentColorId,
  labels,
  onPickColor,
  onUnderline,
  onStrikethrough,
  onSaveNote,
  onCite,
  onDismiss,
}: SelectionStripProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const pos = useStripPosition(ref, pageEl, capture, noteOpen);
  useStripDismissal(ref, onDismiss, noteOpen);

  const current = colors.find((color) => color.id === currentColorId);

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={labels.toolbar}
      data-testid="pdf-selection-strip"
      className={CHASSIS}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
    >
      {noteOpen ? (
        <SelectionStripNoteEditor
          colorSwatchClassName={current?.swatchClassName ?? ''}
          eyebrow={labels.noteEyebrow}
          placeholder={labels.notePlaceholder}
          cancelHint={labels.noteCancelHint}
          saveHint={labels.noteSaveHint}
          onSave={onSaveNote}
          onCancel={() => {
            setNoteOpen(false);
          }}
        />
      ) : (
        <SelectionStripRoster
          colors={colors}
          currentColorId={currentColorId}
          labels={labels}
          onPickColor={onPickColor}
          onUnderline={onUnderline}
          onStrikethrough={onStrikethrough}
          onOpenNote={() => {
            setNoteOpen(true);
          }}
          onCite={onCite}
        />
      )}
    </div>
  );
};
