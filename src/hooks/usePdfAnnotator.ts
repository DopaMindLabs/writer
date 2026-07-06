import { useCallback } from 'react';
import { useUI } from '@/store/ui';
import {
  addPdfHighlight,
  deletePdfAnnotation,
  setPdfAnnotationColor,
  setPdfAnnotationNote,
} from '@/lib/pdf-annotations';
import { useAnnotator, type PdfSelectionCapture } from '@/pdf-annotator';
import { usePdfAnnotations } from './usePdfAnnotations';
import type { PdfAnnotation, PdfAnnotationKind } from '@/db/schema';
import type { HighlightColor } from '@/theme/tokens';

export interface PdfAnnotator {
  color: HighlightColor;
  setColor: (color: HighlightColor) => void;
  annotations: PdfAnnotation[];
  /** The stashed selection; the selection strip renders while non-null. */
  capture: PdfSelectionCapture | null;
  handleCapture: (capture: PdfSelectionCapture) => void;
  clearCapture: () => void;
  /** Persist the stash as the chosen kind/colour (+ optional note), then clear
   * the DOM selection and the stash. */
  apply: (input: {
    kind: PdfAnnotationKind;
    color: HighlightColor;
    note?: string;
  }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  recolor: (id: string, color: HighlightColor) => Promise<void>;
  setNote: (id: string, note: string) => Promise<void>;
}

/**
 * Binds the module's `useAnnotator` to the app: the Dexie facades, the ui-store
 * colour preference, and the live `usePdfAnnotations` query. A selection is only
 * stashed; the selection strip is the sole apply path — there is no toggle mode.
 */
export const usePdfAnnotator = ({
  mediaId,
  spaceId,
}: { mediaId: string; spaceId: string }): PdfAnnotator => {
  const color = useUI((s) => s.pdfHighlightColor);
  const setColor = useUI((s) => s.setPdfHighlightColor);
  const annotations = usePdfAnnotations(mediaId);

  const annotator = useAnnotator({
    apply: async ({ capture, kind, color: col, note }) => {
      await addPdfHighlight({
        mediaId,
        spaceId,
        capture,
        kind,
        color: col as HighlightColor,
        note,
      });
    },
    remove: deletePdfAnnotation,
    recolor: (id, col) => setPdfAnnotationColor(id, col as HighlightColor),
    setNote: setPdfAnnotationNote,
  });

  const apply = useCallback(
    async ({ kind, color: col, note }: { kind: PdfAnnotationKind; color: HighlightColor; note?: string }) => {
      const { capture } = annotator;
      if (!capture) return;
      await annotator.apply({ capture, kind, color: col, note });
      window.getSelection()?.removeAllRanges();
      annotator.clearCapture();
    },
    [annotator],
  );

  return {
    color,
    setColor,
    annotations,
    capture: annotator.capture,
    handleCapture: annotator.handleCapture,
    clearCapture: annotator.clearCapture,
    apply,
    remove: deletePdfAnnotation,
    recolor: setPdfAnnotationColor,
    setNote: setPdfAnnotationNote,
  };
};
