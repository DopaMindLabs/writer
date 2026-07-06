import { useCallback, useState } from 'react';
import { useUI } from '@/store/ui';
import {
  addPdfHighlight,
  deletePdfAnnotation,
  setPdfAnnotationColor,
  setPdfAnnotationNote,
} from '@/lib/pdf-annotations';
import { useAnnotator, type PdfSelectionCapture } from '@/pdf-annotator';
import { usePdfAnnotations } from './usePdfAnnotations';
import type { PdfAnnotation } from '@/db/schema';
import type { HighlightColor } from '@/theme/tokens';

export interface PdfAnnotator {
  armed: boolean;
  toggleArmed: () => void;
  color: HighlightColor;
  setColor: (color: HighlightColor) => void;
  annotations: PdfAnnotation[];
  /** The most recent selection, kept so a one-off colour choice can apply it
   * after the click has already collapsed the DOM selection. */
  lastCapture: PdfSelectionCapture | null;
  handleCapture: (capture: PdfSelectionCapture) => void;
  applyToLastCapture: (color: HighlightColor) => Promise<void>;
  remove: (id: string) => Promise<void>;
  recolor: (id: string, color: HighlightColor) => Promise<void>;
  setNote: (id: string, note: string) => Promise<void>;
}

/**
 * Binds the module's `useAnnotator` to the app: the Dexie annotation facades,
 * the ui-store colour preference, and the live `usePdfAnnotations` query. The
 * armed-mode surface is carried over verbatim from the landed highlighter and is
 * removed in PE.4 when the selection strip lands.
 */
export const usePdfAnnotator = ({
  mediaId,
  spaceId,
}: { mediaId: string; spaceId: string }): PdfAnnotator => {
  const [armed, setArmed] = useState(false);
  const color = useUI((s) => s.pdfHighlightColor);
  const setColor = useUI((s) => s.setPdfHighlightColor);
  const annotations = usePdfAnnotations(mediaId);

  const persist = useCallback(
    (capture: PdfSelectionCapture, col: HighlightColor) =>
      addPdfHighlight({ mediaId, spaceId, capture, color: col }),
    [mediaId, spaceId],
  );

  const annotator = useAnnotator({
    apply: async ({ capture, color: col }) => {
      await persist(capture, col as HighlightColor);
    },
    remove: deletePdfAnnotation,
    recolor: (id, col) => setPdfAnnotationColor(id, col as HighlightColor),
    setNote: setPdfAnnotationNote,
  });

  const handleCapture = useCallback(
    (capture: PdfSelectionCapture) => {
      if (armed) {
        void persist(capture, color);
        window.getSelection()?.removeAllRanges();
        annotator.clearCapture();
      } else {
        annotator.handleCapture(capture);
      }
    },
    [armed, color, persist, annotator],
  );

  const applyToLastCapture = useCallback(
    async (col: HighlightColor) => {
      const { capture } = annotator;
      if (!capture) return;
      await persist(capture, col);
      annotator.clearCapture();
    },
    [annotator, persist],
  );

  const toggleArmed = useCallback(() => {
    setArmed((a) => !a);
  }, []);

  return {
    armed,
    toggleArmed,
    color,
    setColor,
    annotations,
    lastCapture: annotator.capture,
    handleCapture,
    applyToLastCapture,
    remove: deletePdfAnnotation,
    recolor: setPdfAnnotationColor,
    setNote: setPdfAnnotationNote,
  };
};
