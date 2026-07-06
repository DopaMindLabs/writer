import { useCallback, useState } from 'react';
import { useUI } from '@/store/ui';
import {
  addPdfHighlight,
  deletePdfAnnotation,
  setPdfAnnotationColor,
  setPdfAnnotationNote,
} from '@/lib/pdf-annotations';
import { usePdfAnnotations } from './usePdfAnnotations';
import type { PdfAnnotation } from '@/db/schema';
import type { HighlightColor } from '@/theme/tokens';
import type { PdfSelectionCapture } from '@/pdf-annotator/core/types';

export interface PdfHighlighter {
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
 * The highlighter controller consumed by the viewer's toolbar and overlay
 * slots. Armed mode highlights any selection instantly in the current colour
 * (the macOS Preview model); with the mode off, a selection is stashed so
 * choosing a colour applies it once. Armed state is deliberately not persisted —
 * it defaults off on every open.
 */
export const usePdfHighlighter = ({
  mediaId,
  spaceId,
}: { mediaId: string; spaceId: string }): PdfHighlighter => {
  const [armed, setArmed] = useState(false);
  const [lastCapture, setLastCapture] = useState<PdfSelectionCapture | null>(null);
  const color = useUI((s) => s.pdfHighlightColor);
  const setColor = useUI((s) => s.setPdfHighlightColor);
  const annotations = usePdfAnnotations(mediaId);

  const persist = useCallback(
    (capture: PdfSelectionCapture, col: HighlightColor) =>
      addPdfHighlight({ mediaId, spaceId, capture, color: col }),
    [mediaId, spaceId],
  );

  const handleCapture = useCallback(
    (capture: PdfSelectionCapture) => {
      if (armed) {
        void persist(capture, color);
        window.getSelection()?.removeAllRanges();
        setLastCapture(null);
      } else {
        setLastCapture(capture);
      }
    },
    [armed, color, persist],
  );

  const applyToLastCapture = useCallback(
    async (col: HighlightColor) => {
      if (!lastCapture) return;
      await persist(lastCapture, col);
      setLastCapture(null);
    },
    [lastCapture, persist],
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
    lastCapture,
    handleCapture,
    applyToLastCapture,
    // The facade functions already match the interface — no wrappers needed.
    remove: deletePdfAnnotation,
    recolor: setPdfAnnotationColor,
    setNote: setPdfAnnotationNote,
  };
};
