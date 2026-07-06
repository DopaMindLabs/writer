import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { computeStripPosition, type StripPosition } from './stripPosition';
import type { SelectionCapture } from '../core/types';

/**
 * Measures the strip and positions it against the page box. Re-runs when the
 * capture, page or note-editor state changes (the note editor is taller).
 * Returns null until the first measured pass so the caller can hide the strip.
 */
export const useStripPosition = (
  ref: RefObject<HTMLDivElement | null>,
  pageEl: HTMLElement,
  capture: SelectionCapture,
  noteOpen: boolean,
): StripPosition | null => {
  const [pos, setPos] = useState<StripPosition | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pageBox = pageEl.getBoundingClientRect();
    const stripBox = el.getBoundingClientRect();
    setPos(computeStripPosition(capture, pageBox, stripBox.width, stripBox.height));
  }, [ref, capture, pageEl, noteOpen]);
  return pos;
};

/**
 * Dismisses the strip on `Escape` (unless the note editor is open) and on a
 * `pointerdown` outside it. Listeners are torn down on unmount.
 */
export const useStripDismissal = (
  ref: RefObject<HTMLDivElement | null>,
  onDismiss: () => void,
  noteOpen: boolean,
): void => {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !noteOpen) onDismiss();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, onDismiss, noteOpen]);
};
