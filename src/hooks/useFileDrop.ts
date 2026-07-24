import { useState, type DragEvent } from 'react';

/** True only for a genuine file drag — not the app's own row-drag payload. */
const hasFiles = (event: DragEvent): boolean =>
  Array.from(event.dataTransfer.types).includes('Files');

export interface FileDropHandlers {
  onDragEnter: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
}

export interface FileDrop {
  dragging: boolean;
  handlers: FileDropHandlers;
}

/**
 * Page-scoped file-drop state for the library surface. A depth counter (not a
 * boolean) rides out the enter/leave flicker as the pointer crosses child
 * elements, so the overlay does not blink. Only file drags are handled; the
 * app's own row-drag payload passes straight through.
 */
export const useFileDrop = (onFiles: (files: File[]) => void): FileDrop => {
  const [depth, setDepth] = useState(0);

  const onDragEnter = (event: DragEvent): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDepth((current) => current + 1);
  };

  const onDragLeave = (event: DragEvent): void => {
    if (!hasFiles(event)) return;
    setDepth((current) => Math.max(0, current - 1));
  };

  const onDragOver = (event: DragEvent): void => {
    if (hasFiles(event)) event.preventDefault();
  };

  const onDrop = (event: DragEvent): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDepth(0);
    onFiles(Array.from(event.dataTransfer.files));
  };

  return {
    dragging: depth > 0,
    handlers: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
};
