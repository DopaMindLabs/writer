import { useCallback, useState } from 'react';
import type { AnnotationKind, SelectionCapture } from '../core/types';

/** The persistence operations the host binds to the annotator. */
export interface AnnotatorCallbacks {
  apply: (input: {
    capture: SelectionCapture;
    kind: AnnotationKind;
    color: string;
    note?: string;
  }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  recolor: (id: string, color: string) => Promise<void>;
  setNote: (id: string, note: string) => Promise<void>;
}

export interface Annotator extends AnnotatorCallbacks {
  /** The stashed selection; the selection strip renders while non-null. */
  capture: SelectionCapture | null;
  handleCapture: (capture: SelectionCapture) => void;
  clearCapture: () => void;
}

/**
 * The engine-agnostic annotator controller. It owns only the selection stash and
 * exposes the host's persistence callbacks unchanged, so the module never
 * touches the db, the ui store, or i18n. The host binds it to those systems
 * (see the app's `usePdfAnnotator`).
 */
export const useAnnotator = (callbacks: AnnotatorCallbacks): Annotator => {
  const [capture, setCapture] = useState<SelectionCapture | null>(null);

  const handleCapture = useCallback((next: SelectionCapture) => {
    setCapture(next);
  }, []);

  const clearCapture = useCallback(() => {
    setCapture(null);
  }, []);

  return { ...callbacks, capture, handleCapture, clearCapture };
};
