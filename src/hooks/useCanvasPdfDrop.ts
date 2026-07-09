import { useCallback, type DragEvent, type RefObject } from 'react';
import { useUI } from '@/store/ui';
import { filePdfToBrainSpace } from '@/lib/brain/filePdfToBrainSpace';
import { MEDIA_DND_TYPE } from '@/data/dnd';

export interface CanvasPdfDrop {
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

/** The drop point in canvas coordinates: the pointer offset within the scroll
 * box plus how far it is scrolled. Falls back to the origin if a drop carries no
 * coordinates. */
const dropOrigin = (
  event: DragEvent<HTMLElement>,
  scroller: HTMLDivElement | null,
): { l: number; t: number } => {
  const rect = scroller?.getBoundingClientRect();
  return {
    l: (scroller?.scrollLeft ?? 0) + finite(event.clientX - (rect?.left ?? 0)),
    t: (scroller?.scrollTop ?? 0) + finite(event.clientY - (rect?.top ?? 0)),
  };
};

/**
 * Lets the brain-space canvas accept a library row dragged onto it: a media-id
 * drag is allowed to drop, and dropping files the PDF as a card at the drop
 * point (through the shared `filePdfToBrainSpace` facade). File drags and other
 * payloads are ignored, so this never competes with note dragging.
 */
export const useCanvasPdfDrop = (
  spaceId: string,
  scrollRef: RefObject<HTMLDivElement | null>,
): CanvasPdfDrop => {
  const focusNote = useUI((s) => s.focusNote);

  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (Array.from(event.dataTransfer.types).includes(MEDIA_DND_TYPE)) {
      event.preventDefault();
    }
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const mediaId = event.dataTransfer.getData(MEDIA_DND_TYPE);
      if (!mediaId) return;
      event.preventDefault();
      const at = dropOrigin(event, scrollRef.current);
      void filePdfToBrainSpace({ spaceId, mediaId, at }).then((note) => {
        focusNote(note.id);
      });
    },
    [spaceId, scrollRef, focusNote],
  );

  return { onDragOver, onDrop };
};
