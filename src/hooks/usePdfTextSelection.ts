import { useEffect, type RefObject } from 'react';
import { captureFromRects, resolveSelectionPage } from '@/lib/pdf/pdfSelection';
import type { PdfSelectionCapture } from '@/lib/pdf/pdfGeometry';

interface UsePdfTextSelectionOptions {
  containerRef: RefObject<HTMLElement | null>;
  onCapture: (capture: PdfSelectionCapture) => void;
}

/**
 * Reports a highlightable selection whenever the user finishes selecting text
 * inside the viewer — on `pointerup` (mouse/touch drag) and `keyup`
 * (Shift+arrow). Rects come exclusively from the Selection API
 * (`range.getClientRects()`), never from tracked pointer coordinates, so a real
 * drag and a programmatically built Range drive the identical path. Listeners
 * are cleaned up on unmount.
 */
export const usePdfTextSelection = ({
  containerRef,
  onCapture,
}: UsePdfTextSelectionOptions): void => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handle = (): void => {
      const selection = window.getSelection();
      if (!selection) return;
      const resolved = resolveSelectionPage(selection, container);
      if (!resolved) return;
      const range = selection.getRangeAt(0);
      const capture = captureFromRects(
        range.getClientRects(),
        resolved.pageEl.getBoundingClientRect(),
        selection.toString(),
        resolved.page,
      );
      if (capture) onCapture(capture);
    };

    container.addEventListener('pointerup', handle);
    container.addEventListener('keyup', handle);
    return () => {
      container.removeEventListener('pointerup', handle);
      container.removeEventListener('keyup', handle);
    };
  }, [containerRef, onCapture]);
};
